import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { getAllAutoPublishReadyAnnouncements, publishAnnouncement } from 'src/app/actions/announcement/announcement-actions';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { revalidatePath } from 'next/cache';
import { tokens } from 'src/locales/tokens';

// Extend dayjs with timezone support (safe to call repeatedly)
if (!(dayjs as any)._tzExtended) {
     dayjs.extend(utc); // add UTC first
     dayjs.extend(timezone);
     (dayjs as any)._tzExtended = true; // mark so we don't extend twice in hot reload
}

// Expect a secret in header: x-cron-secret
const CRON_SECRET = process.env.X_CRON_SECRET_SHEDULER;
// Grace forward seconds: publish if scheduled_at is within this many seconds in the future
const FORWARD_GRACE_SECONDS = parseInt(process.env.CRON_FORWARD_GRACE_SECONDS || '30', 10); // small clock drift allowance
// (Optional) Lookback window minutes - mainly informational since we publish anything already past
const LOOKBACK_MINUTES = parseInt(process.env.CRON_LOOKBACK_MINUTES || '15', 10);

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
          const now = dayjs();
          let toPublish: string[] = [];

          const nowWithGrace = now.add(FORWARD_GRACE_SECONDS, 'second');
          const lookbackCutoff = now.subtract(LOOKBACK_MINUTES, 'minute');

          for (const ann of drafts) {
               const scheduledAt = (ann as any).scheduled_at as string | null;
               const tzid = (ann as any).scheduled_timezone as string | null;
               const enabled = (ann as any).schedule_enabled;
               if (!enabled || !scheduledAt) continue;
               // Parse naive local timestamp in provided timezone if available; fallback to local.
               let scheduledMoment = tzid ? dayjs.tz(scheduledAt, tzid) : dayjs(scheduledAt);
               if (!scheduledMoment.isValid()) continue;
               // If it's before now (including far past) OR within the forward grace window, publish.
               // (lookbackCutoff is informational; we still publish items older than lookback to avoid missing due items.)
               if (scheduledMoment.isBefore(nowWithGrace) || scheduledMoment.isSame(nowWithGrace)) {
                    toPublish.push(ann.id);
               }
          }
          if (toPublish.length) {
               console.log('[cron publish] due announcements:', toPublish);
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
               failed: results.filter(r => !r.success),
               forwardGraceSeconds: FORWARD_GRACE_SECONDS,
               lookbackMinutes: LOOKBACK_MINUTES
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
