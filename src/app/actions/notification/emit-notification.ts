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

          // 2) Digest per user
          const byUser = new Map<string, Notification[]>();
          for (const r of rows) {
               if (!r.user_id) continue;
               const arr = byUser.get(r.user_id) ?? [];
               arr.push(r);
               byUser.set(r.user_id, arr);
          }
          const userIds = Array.from(byUser.keys());
          log(`Prepared digests for ${userIds.length} users`, 'warn');
          userIds.forEach(uid => {
               log(`Prepared digest for user: ${uid}`, 'warn');
          });

          if (userIds.length === 0) {
               await logServerAction({
                    user_id: null,
                    action: 'emitNotificationsInsert+Transports',
                    duration_ms: Date.now() - time,
                    error: '',
                    payload: { inserted, users: 0, waSent: 0, waErrors: 0, emailSent: 0, emailErrors: 0 },
                    status: 'success',
                    type: 'db',
               });
               return { success: true, inserted };
          }

          const contactsRes = await readTenantContactByUserIds(userIds);
          log(`Contacts fetch result: ${contactsRes.success ? 'success' : 'fail'}`, contactsRes.error ? 'error' : 'warn');
          const contacts = contactsRes.success ? (contactsRes as any).data as Record<string, any> : {};
          log(`Fetched ${contactsRes.success ? Object.keys(contacts).length : 0} contacts for ${userIds.length} users`, 'warn');

          let waSent = 0, waErrors = 0, emailSent = 0, emailErrors = 0;

          // 3) Per-user: pick channels, format, send
          // for (const uid of userIds) {
          //      const items = (byUser.get(uid) ?? []).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
          //      const c = contacts[uid];

          //      const canWhatsApp = !!c?.phone_number && (c?.whatsapp_opt_in === true || c?.sms_opt_in === true);
          //      const canEmail = !!c?.email && (c?.email_opt_in !== false); // default opt-in unless disabled

          // // If neither channel is allowed, skip quietly.
          // if (!canWhatsApp && !canEmail) continue;

          // // Email
          // if (canEmail) {
          //      try {
          //           const em = formatEmail(items);
          //           const res = await sendViaEmail(c.email, em.subject, em.html);
          //           if (res.ok) {
          //                emailSent++;
          //                log(`[emitNotifications] Email sent to ${c.email} (uid: ${uid}) id=${res.id || 'n/a'}`, 'warn');
          //           } else {
          //                emailErrors++;
          //                log(`[emitNotifications] Email error to ${c.email} (uid: ${uid}): ${res.error || 'unknown'}`, 'error');
          //                await logServerAction({
          //                     user_id: uid,
          //                     action: 'emitNotificationsEmail',
          //                     duration_ms: 0,
          //                     error: res.error || 'unknown',
          //                     payload: { email: c.email, user_id: uid },
          //                     status: 'fail',
          //                     type: 'external',
          //                });
          //           }
          //      } catch (e: any) {
          //           emailErrors++;
          //           log(`[emitNotifications] Email throw to ${c.email} (uid: ${uid}): ${e?.message || 'unknown'}`, 'error');
          //      }
          // }
          // }

          await logServerAction({
               user_id: null,
               action: 'emitNotificationsInsert+Transports',
               duration_ms: Date.now() - time,
               error: '',
               payload: { inserted, users: userIds.length, waSent, waErrors, emailSent, emailErrors },
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