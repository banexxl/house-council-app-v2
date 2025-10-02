import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { getAllAutoPublishReadyAnnouncements, publishAnnouncement } from 'src/app/actions/announcement/announcement-actions';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { revalidatePath } from 'next/cache';
import { tokens } from 'src/locales/tokens';

// Expect a secret in header: x-cron-secret
const CRON_SECRET = process.env.X_CRON_SECRET_SHEDULER;

export async function POST(req: NextRequest) {
     const started = Date.now();
     const provided = req.headers.get('x-cron-secret');
     if (!CRON_SECRET || provided !== CRON_SECRET) {
          await logServerAction({
               user_id: null,
               action: 'cronPublishScheduledAuthFail',
               duration_ms: Date.now() - started,
               error: 'Unauthorized',
               payload: {},
               status: 'fail',
               type: 'auth'
          });
          return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
     }

     try {
          const drafts = await getAllAutoPublishReadyAnnouncements();
          console.log('drafts', drafts);

          const now = dayjs();
          let toPublish: string[] = [];

          for (const ann of drafts) {
               const scheduledAt = (ann as any).scheduled_at as string | null;
               const enabled = (ann as any).schedule_enabled;
               if (!enabled || !scheduledAt) continue;
               // Treat stored naive local timestamp as local server time (approximation) since tz plugin not enabled here.
               const scheduledMoment = dayjs(scheduledAt);
               if (!scheduledMoment.isValid()) continue;
               if (scheduledMoment.isBefore(now) || scheduledMoment.isSame(now)) toPublish.push(ann.id);
          }

          const results: { id: string; success: boolean; error?: string }[] = [];
          for (const id of toPublish) {
               const res = await publishAnnouncement(id, { value: 'announcement', labelToken: tokens.notifications.tabs.announcement } as any);
               console.log('publish result', id, res);

               if (!res.success) results.push({ id, success: false, error: res.error }); else results.push({ id, success: true });
          }

          await logServerAction({
               user_id: null,
               action: 'cronPublishScheduledRun',
               duration_ms: Date.now() - started,
               error: '',
               payload: { checked: drafts.length, published: results.filter(r => r.success).length },
               status: 'success',
               type: 'db'
          });
          revalidatePath('/');
          return NextResponse.json({
               success: true,
               checked: drafts.length,
               publishAttempts: toPublish.length,
               published: results.filter(r => r.success),
               failed: results.filter(r => !r.success)
          });
     } catch (e: any) {
          await logServerAction({
               user_id: null,
               action: 'cronPublishScheduledRun',
               duration_ms: Date.now() - started,
               error: e?.message || 'unexpected',
               payload: {},
               status: 'fail',
               type: 'db'
          });
          return NextResponse.json({ success: false, error: e?.message || 'Unexpected error' }, { status: 500 });
     }
}
