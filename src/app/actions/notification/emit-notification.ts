import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { TABLES } from 'src/libs/supabase/tables';
import log from 'src/utils/logger';
import { readTenantContactByUserIds } from '../tenant/tenant-actions';
import { Notification } from 'src/types/notification';


type EmitResult = { success: boolean; error?: string; inserted?: number };

export async function emitNotifications(
     rows: Notification[]
): Promise<EmitResult> {
     log(`Emitting ${rows.length} notifications`, 'warn');
     const time = Date.now();
     if (!rows || rows.length === 0) return { success: true, inserted: 0 };

     try {
          // 1) Insert into DB (batch)
          const supabase = await useServerSideSupabaseAnonClient();
          const BATCH = 500;
          let inserted = 0;

          for (let i = 0; i < rows.length; i += BATCH) {
               const slice = rows.slice(i, i + BATCH);
               const dbSlice = slice.map((r) => ({
                    ...r,
                    type: r.type.value, // 🔑 store literal in DB
               }));
               const { error } = await supabase.from(TABLES.NOTIFICATIONS).insert(dbSlice as any);
               log(`Inserted batch of ${slice.length} notifications`, 'warn');
               console.log('error', error);
               if (error) {
                    log(`Error inserting notifications: ${error.message}`, 'error');
                    await logServerAction({
                         user_id: null,
                         action: 'emitNotificationsInsert',
                         duration_ms: Date.now() - time,
                         error: error.message,
                         payload: { count: slice.length },
                         status: 'fail',
                         type: 'db',
                    });
                    return { success: false, error: error.message };
               }
               inserted += slice.length;
          }

          await logServerAction({
               user_id: null,
               action: 'emitNotificationsInsert+Transports',
               duration_ms: Date.now() - time,
               error: '',
               payload: { inserted },
               status: 'success',
               type: 'db',
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
               type: 'db',
          });
          return { success: false, error: e?.message || 'Unexpected error' };
     }
}