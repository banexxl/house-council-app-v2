import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { TABLES } from 'src/libs/supabase/tables';
import log from 'src/utils/logger';
import { Notification } from 'src/types/notification';

type EmitResult = { success: boolean; error?: string; inserted?: number };

export async function emitNotifications(
     rows: Notification[],
     supabaseOverride?: { from: (table: string) => any }
): Promise<EmitResult> {

     log(`Emitting ${rows.length} notifications`, 'warn');
     const time = Date.now();

     if (!rows || rows.length === 0) return { success: true, inserted: 0 };

     try {

          const supabase = supabaseOverride ?? (await useServerSideSupabaseAnonClient());

          const BATCH = 500;
          let inserted = 0;

          for (let i = 0; i < rows.length; i += BATCH) {

               const slice = rows.slice(i, i + BATCH);

               const dbSlice = slice.map((r) => ({
                    ...r,
                    type: r.type.value
               }));

               const { error } = await supabase
                    .from(TABLES.NOTIFICATIONS)
                    .insert(dbSlice as any);

               if (error) {
                    log(`Error inserting notifications: ${error.message}`, 'error');

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
                    title: n.type.value,
                    body: n.description,
                    data: {
                         action: n.action_token,
                         url: n.url,
                         // notification_id: n.id
                    },
                    status: 'pending'
               }));

               const { error: queueError } = await supabase
                    .from('tblNotificationQueue')
                    .insert(pushRows);
               if (queueError) {
                    console.log(`Error inserting push queue: ${queueError.message}`);
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