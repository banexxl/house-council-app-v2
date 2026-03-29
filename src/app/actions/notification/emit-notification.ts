import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { TABLES } from 'src/libs/supabase/tables';
import { Notification, NotificationType } from 'src/types/notification';

const DEFAULT_NOTIFICATION_TITLES: Record<NotificationType, string> = {
     all: 'All',
     system: 'System',
     message: 'Message',
     reminder: 'Reminder',
     alert: 'Alert',
     calendar: 'Calendar',
     announcement: 'Announcement',
     social: 'Social',
     poll: 'Poll',
     incident: 'Incident',
     other: 'Other',
};

function resolveTypeValue(notification: Notification): NotificationType {
     const rawType = (notification as any)?.type;
     if (typeof rawType === 'string') {
          return rawType as NotificationType;
     }
     if (rawType && typeof rawType === 'object' && typeof rawType.value === 'string') {
          return rawType.value as NotificationType;
     }
     return 'other';
}

function resolveMobileScreen(notification: Notification): string {
     const type = resolveTypeValue(notification);

     switch (type) {
          case 'announcement':
               return 'announcements';

          case 'message':
               return 'chat';

          case 'calendar':
               return 'calendar';

          case 'poll':
               return 'polls';

          case 'incident':
               return 'issues';

          case 'social':
               return 'social'; // or feed if you have one

          case 'alert':
          case 'system':
          case 'reminder':
               return 'calendar'
          default:
               return 'notifications'; // fallback screen
     }
}

function resolveQueueTitle(notification: Notification): string {
     const explicitTitle = (notification as any)?.title;
     if (typeof explicitTitle === 'string' && explicitTitle.trim().length > 0) {
          return explicitTitle.trim();
     }

     const typeValue = resolveTypeValue(notification);
     return DEFAULT_NOTIFICATION_TITLES[typeValue] ?? DEFAULT_NOTIFICATION_TITLES.other;
}

type EmitResult = { success: boolean; error?: string; inserted?: number };

export async function emitNotifications(
     rows: Notification[],
): Promise<EmitResult> {

     console.log(`Emitting ${rows.length} notifications`);
     const time = Date.now();


     if (!rows || rows.length === 0) return { success: true, inserted: 0 };

     try {

          const supabase = await useServerSideSupabaseAnonClient()

          const BATCH = 500;
          let inserted = 0;

          for (let i = 0; i < rows.length; i += BATCH) {

               const slice = rows.slice(i, i + BATCH);

               const dbSlice = slice.map((r) => ({
                    ...r,
                    type: resolveTypeValue(r)
               }));

               const { error } = await supabase
                    .from(TABLES.NOTIFICATIONS)
                    .insert(dbSlice as any);

               if (error) {
                    console.log(`Error inserting notifications: ${error.message}`);

                    await logServerAction({
                         user_id: null,
                         action: 'emitNotificationsInsert',
                         duration_ms: Date.now() - time,
                         error: error.message,
                         payload: { count: slice.length },
                         status: 'fail',
                         type: 'db'
                    });

                    return { success: false, error: error.message };
               }

               inserted += slice.length;

               /*
               ============================
               PUSH QUEUE INSERT
               ============================
               */

               const pushRows = slice.map((n) => ({
                    user_id: n.user_id,
                    title: resolveQueueTitle(n),
                    body: n.description,
                    data: {
                         action: n.action_token,
                         url: n.url,
                         mobileUrl: n.mobile_screen ?? resolveMobileScreen(n),
                    },
                    status: 'pending'
               }));

               const { error: queueError } = await supabase
                    .from('tblNotificationQueue')
                    .insert(pushRows);
               if (queueError) {
                    console.log(`Error inserting push queue: ${queueError.message}`);
                    await logServerAction({
                         user_id: null,
                         action: 'emitNotificationsInsert+Queue',
                         duration_ms: Date.now() - time,
                         error: queueError.message,
                         payload: { inserted },
                         status: 'fail',
                         type: 'db'
                    });
               }
          }

          await logServerAction({
               user_id: null,
               action: 'emitNotificationsInsert+Queue',
               duration_ms: Date.now() - time,
               error: '',
               payload: { inserted },
               status: 'success',
               type: 'db'
          });

          return { success: true, inserted };

     } catch (e: any) {

          await logServerAction({
               user_id: null,
               action: 'emitNotificationsUnexpected',
               duration_ms: Date.now() - time,
               error: e?.message || 'unexpected',
               payload: { count: rows.length },
               status: 'fail',
               type: 'db'
          });

          return { success: false, error: e?.message || 'Unexpected error' };
     }
}