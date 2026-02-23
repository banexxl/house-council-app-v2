import { NextRequest, NextResponse } from 'next/server'
import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server'
import { logServerAction } from 'src/libs/supabase/server-logging'
import { emitNotifications } from 'src/app/actions/notification/emit-notification';
import { createNotification } from 'src/utils/notification';
import { sendViaEmail } from 'src/app/actions/notification/senders';

// Expect a secret in header: x-cron-secret
const CRON_SECRET = process.env.X_CRON_SECRET;

export const runtime = 'nodejs';

type CalendarEventRow = {
     id: string;
     title: string;
     description?: string | null;
     all_day: boolean;
     calendar_event_type?: string | null;
     start_date_time: string;
     end_date_time: string;
     building_id?: string | null;
};

export async function POST(req: NextRequest) {
     const t0 = Date.now();
     const secret = req.headers.get('x-api-key');
     if (CRON_SECRET && secret !== CRON_SECRET) {
          return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
     }

     const now = new Date();
     const nowIso = now.toISOString();

     // Tolerance window so cron frequency doesn't have to be exact
     const WINDOW_MS = 5 * 60 * 1000;
     const OFFSETS_MIN = [60, 30] as const;
     const offsetMsList = OFFSETS_MIN.map((m) => m * 60 * 1000);

     const minTarget = Math.min(...offsetMsList);
     const maxTarget = Math.max(...offsetMsList);
     const minIso = new Date(now.getTime() + minTarget - WINDOW_MS).toISOString();
     const maxIso = new Date(now.getTime() + maxTarget + WINDOW_MS).toISOString();

     const supabase = await useServerSideSupabaseServiceRoleClient();

     try {
          const { data: eventRows, error: eventsError } = await supabase
               .from(TABLES.CALENDAR_EVENTS)
               .select('id,title,description,all_day,calendar_event_type,start_date_time,end_date_time,building_id')
               .gte('start_date_time', minIso)
               .lte('start_date_time', maxIso)
               .not('building_id', 'is', null);

          if (eventsError) {
               await logServerAction({
                    user_id: null,
                    action: 'cronCalendarEventReminder_queryEvents',
                    duration_ms: Date.now() - t0,
                    error: eventsError.message,
                    payload: { nowIso, minIso, maxIso },
                    status: 'fail',
                    type: 'db',
               });
               return NextResponse.json({ success: false, error: eventsError.message }, { status: 500 });
          }

          const events = (eventRows || []) as CalendarEventRow[];

          let matchedEvents = 0;
          let tenantsConsidered = 0;
          let notificationsPrepared = 0;
          let emailsAttempted = 0;
          let emailsSent = 0;
          let notificationsInserted = 0;

          for (const ev of events) {
               if (!ev?.building_id) continue;
               const start = new Date(ev.start_date_time);
               if (Number.isNaN(start.getTime())) continue;
               const diffMs = start.getTime() - now.getTime();

               // Determine which reminder(s) are due for this event in this run
               const dueOffsetsMin = OFFSETS_MIN.filter((m) => Math.abs(diffMs - m * 60 * 1000) <= WINDOW_MS);
               if (dueOffsetsMin.length === 0) continue;

               matchedEvents += 1;

               // Resolve tenants in building via apartments -> tenants
               const { data: apartments, error: apErr } = await supabase
                    .from(TABLES.APARTMENTS)
                    .select('id')
                    .eq('building_id', ev.building_id);
               if (apErr) continue;

               const apartmentIds = (apartments || []).map((a: any) => a.id).filter(Boolean);
               if (apartmentIds.length === 0) continue;

               const { data: tenants, error: tenErr } = await supabase
                    .from(TABLES.TENANTS)
                    .select('user_id,email')
                    .in('apartment_id', apartmentIds);
               if (tenErr) continue;

               const tenantRows = (tenants || []) as Array<{ user_id: string | null; email: string | null }>;
               const userIds = tenantRows.map((t) => t.user_id).filter(Boolean) as string[];
               tenantsConsidered += userIds.length;
               if (userIds.length === 0) continue;

               for (const offsetMin of dueOffsetsMin) {
                    const actionToken = `calendar_event_reminder_${offsetMin}m_${ev.id}`;

                    // Dedupe: if reminder notification already exists for this user+event+offset, skip
                    const { data: existingRows, error: existingErr } = await supabase
                         .from(TABLES.NOTIFICATIONS)
                         .select('user_id')
                         .eq('action_token', actionToken)
                         .in('user_id', userIds);
                    if (existingErr) continue;

                    const alreadyNotified = new Set((existingRows || []).map((r: any) => r.user_id).filter(Boolean));

                    const createdAt = new Date().toISOString();
                    const notifications: any[] = [];

                    for (const t of tenantRows) {
                         const uid = t.user_id;
                         if (!uid) continue;
                         if (alreadyNotified.has(uid)) continue;

                         const description = `Reminder: ${ev.title} starts in ${offsetMin} minutes.`;
                         const url = '/dashboard/calendar/';

                         notifications.push(
                              createNotification({
                                   type: 'reminder',
                                   action_token: actionToken,
                                   url,
                                   description,
                                   created_at: createdAt,
                                   is_read: false,
                                   building_id: ev.building_id,
                                   user_id: uid,
                                   all_day: !!ev.all_day,
                                   calendar_event_type: ev.calendar_event_type ?? null,
                                   start_date_time: ev.start_date_time,
                                   end_date_time: ev.end_date_time,
                              })
                         );

                         if (t.email) {
                              emailsAttempted += 1;
                              const subject = `Reminder: ${ev.title}`;
                              const startLocal = start.toLocaleString();
                              const html = `
							<p>This is a reminder for an upcoming calendar event.</p>
							<p><strong>${ev.title}</strong></p>
							<p>Starts: ${startLocal}</p>
							<p>Time remaining: ${offsetMin} minutes</p>
							${ev.description ? `<p>${String(ev.description)}</p>` : ''}
							<p><a href="${url}">Open calendar</a></p>
						`;
                              const res = await sendViaEmail(t.email, subject, html);
                              if (res.ok) emailsSent += 1;
                         }
                    }

                    if (notifications.length > 0) {
                         notificationsPrepared += notifications.length;
                         const emitted = await emitNotifications(notifications as any, supabase as any);
                         if (emitted.success) notificationsInserted += emitted.inserted || 0;
                    }
               }
          }

          await logServerAction({
               user_id: null,
               action: 'cronCalendarEventReminder',
               duration_ms: Date.now() - t0,
               error: '',
               payload: {
                    nowIso,
                    windowMs: WINDOW_MS,
                    range: { minIso, maxIso },
                    eventsFetched: events.length,
                    matchedEvents,
                    tenantsConsidered,
                    notificationsPrepared,
                    notificationsInserted,
                    emailsAttempted,
                    emailsSent,
               },
               status: 'success',
               type: 'db',
          });

          return NextResponse.json({
               success: true,
               now: nowIso,
               range: { minIso, maxIso },
               eventsFetched: events.length,
               matchedEvents,
               tenantsConsidered,
               notificationsPrepared,
               notificationsInserted,
               emailsAttempted,
               emailsSent,
          });
     } catch (e: any) {
          await logServerAction({
               user_id: null,
               action: 'cronCalendarEventReminder_unexpected',
               duration_ms: Date.now() - t0,
               error: e?.message || 'unexpected',
               payload: { nowIso },
               status: 'fail',
               type: 'db',
          });
          return NextResponse.json({ success: false, error: e?.message || 'Unexpected error' }, { status: 500 });
     }
}