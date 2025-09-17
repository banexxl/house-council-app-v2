'use server';

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Notification, BaseNotification } from 'src/types/notification';
import { validate as isUUID } from 'uuid';
import { readTenantContactByUserIds } from '../tenant/tenant-actions';
import { sendNotificationEmail } from 'src/libs/email/node-mailer';
import { sendSmsAws } from 'src/libs/sms/aws-sms';

const NOTIFICATIONS_TABLE = 'tblNotifications';

// Batch insert notifications; reusable across server actions
export async function emitNotifications(
     rows: BaseNotification[]
): Promise<{ success: boolean; error?: string; inserted?: number }> {
     // Helper: lookup user emails from Supabase Auth(Admin) using service role.
     async function lookupUserEmails(userIds: string[]): Promise<Record<string, string>> {
          const result: Record<string, string> = {};
          if (!userIds?.length) return result;
          const admin = await useServerSideSupabaseServiceRoleClient();
          // Fetch sequentially to avoid rate limits. Optimize later if needed.
          for (const uid of userIds) {
               try {
                    const { data, error } = await admin.auth.admin.getUserById(uid);
                    if (!error && data?.user?.email) result[uid] = data.user.email;
               } catch { /* ignore per-user errors */ }
          }
          return result;
     }

     // Helper: send email via Resend REST API
     async function sendEmailViaResend(to: string, subject: string, text: string, html?: string): Promise<{ ok: boolean; error?: string }> {
          const apiKey = process.env.RESEND_API_KEY;
          const from = process.env.NOTIFICATIONS_EMAIL_FROM || 'no-reply@example.com';
          if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not set' };
          try {
               const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                         'Authorization': `Bearer ${apiKey}`,
                         'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ from, to, subject, text, html: html || `<p>${text}</p>` }),
               });
               if (!res.ok) return { ok: false, error: `Resend HTTP ${res.status}` };
               return { ok: true };
          } catch (e: any) {
               return { ok: false, error: e?.message || 'network error' };
          }
     }

     // Fanout: best-effort email + SMS dispatch for notifications
     async function dispatchEmailFanout(rows: BaseNotification[]) {
          const time = Date.now();
          try {
               const byUser = new Map<string, BaseNotification[]>();
               for (const r of rows) {
                    if (!r.user_id) continue;
                    const arr = byUser.get(r.user_id) ?? [];
                    arr.push(r);
                    byUser.set(r.user_id, arr);
               }
               const userIds = Array.from(byUser.keys());
               if (userIds.length === 0) return;
               // Read tenant contact preferences
               const contactsRes = await readTenantContactByUserIds(userIds);
               const contacts = contactsRes.success ? contactsRes.data : {};

               let emailSent = 0; let emailErrors = 0; let smsSent = 0; let smsErrors = 0;
               const EMAIL_ENABLED = process.env.NOTIFICATIONS_EMAIL_ENABLED === 'true';
               const SMS_ENABLED = process.env.NOTIFICATIONS_SMS_ENABLED === 'true';

               for (const uid of userIds) {
                    const list = byUser.get(uid)!;
                    const subject = list.length === 1 ? list[0].title : `${list.length} new notifications`;
                    const lines = list.map(n => `• ${n.title}: ${n.description}`).join('\n');
                    const text = `${lines}\n\nOpen the app to view more details.`;
                    const html = `<div>${list.map(n => `<p><strong>${n.title}</strong><br/>${n.description}</p>`).join('')}<p>Open the app to view more details.</p></div>`;

                    const c = contacts[uid] || {};
                    if (EMAIL_ENABLED && c.email && c.email_opt_in === true) {
                         const res = await sendNotificationEmail(c.email, subject, html, text);
                         if (res.ok) emailSent++; else emailErrors++;
                    }
                    if (SMS_ENABLED && c.phone_number && c.sms_opt_in === true) {
                         const res = await sendSmsAws(c.phone_number, text);
                         if (res.ok) smsSent++; else smsErrors++;
                    }
               }
               await logServerAction({ user_id: null, action: 'notificationsFanout', duration_ms: Date.now() - time, error: '', payload: { users: userIds.length, emailSent, emailErrors, smsSent, smsErrors }, status: 'success', type: 'db' });
          } catch (e: any) {
               await logServerAction({ user_id: null, action: 'notificationsFanout', duration_ms: Date.now() - time, error: e?.message || 'unexpected', payload: {}, status: 'fail', type: 'db' });
          }
     }

     const time = Date.now();
     if (!rows || rows.length === 0) return { success: true, inserted: 0 };
     try {
          const supabase = await useServerSideSupabaseAnonClient();
          const BATCH = 500;
          let inserted = 0;
          for (let i = 0; i < rows.length; i += BATCH) {
               const slice = rows.slice(i, i + BATCH);
               const { error } = await supabase.from(NOTIFICATIONS_TABLE).insert(slice as any);
               if (error) {
                    await logServerAction({ user_id: null, action: 'emitNotifications', duration_ms: Date.now() - time, error: error.message, payload: { count: slice.length }, status: 'fail', type: 'db' });
                    return { success: false, error: error.message };
               }
               inserted += slice.length;
          }
          await logServerAction({ user_id: null, action: 'emitNotifications', duration_ms: Date.now() - time, error: '', payload: { count: inserted }, status: 'success', type: 'db' });
          // Optional email fanout (await to ensure delivery for now)
          await dispatchEmailFanout(rows);
          return { success: true, inserted };
     } catch (e: any) {
          await logServerAction({ user_id: null, action: 'emitNotificationsUnexpected', duration_ms: Date.now() - time, error: e?.message || 'unexpected', payload: { count: rows.length }, status: 'fail', type: 'db' });
          return { success: false, error: e?.message || 'Unexpected error' };
     }
}


export async function getAllNotifications(): Promise<{ success: boolean; data?: Notification[]; error?: string; }> {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null);
     const { data, error } = await supabase.from(NOTIFICATIONS_TABLE).select('*').order('created_at', { ascending: false });
     if (error) {
          await logServerAction({ user_id, action: 'getAllNotifications', duration_ms: Date.now() - time, error: error.message, payload: {}, status: 'fail', type: 'db' });
          return { success: false, error: error.message };
     }
     await logServerAction({ user_id, action: 'getAllNotifications', duration_ms: Date.now() - time, error: '', payload: { count: data?.length || 0 }, status: 'success', type: 'db' });
     return { success: true, data: data as Notification[] };
}

export async function getNotificationsForClient(): Promise<{ success: boolean; data?: Notification[]; error?: string; }> {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null);
     if (!isUUID(user_id)) return { success: false, error: 'Invalid client ID' };
     const { data, error } = await supabase.from(NOTIFICATIONS_TABLE).select('*').eq('user_id', user_id).order('created_at', { ascending: false });
     if (error) {
          await logServerAction({ user_id, action: 'getNotificationsForClient', duration_ms: Date.now() - time, error: error.message, payload: { user_id }, status: 'fail', type: 'db' });
          return { success: false, error: error.message };
     }
     await logServerAction({ user_id, action: 'getNotificationsForClient', duration_ms: Date.now() - time, error: '', payload: { user_id, count: data?.length || 0 }, status: 'success', type: 'db' });
     return { success: true, data: data as Notification[] };
}

export async function deleteNotification(id: string) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null);
     if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
     const { error } = await supabase.from(NOTIFICATIONS_TABLE).delete().eq('id', id);
     if (error) {
          await logServerAction({ user_id, action: 'deleteNotification', duration_ms: Date.now() - time, error: error.message, payload: { id }, status: 'fail', type: 'db' });
          return { success: false, error: error.message };
     }
     revalidatePath('/dashboard/notifications');
     await logServerAction({ user_id, action: 'deleteNotification', duration_ms: Date.now() - time, error: '', payload: { id }, status: 'success', type: 'db' });
     return { success: true };
}

export async function markNotificationRead(id: string, read: boolean): Promise<{ success: boolean; error?: string; }> {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null);
     if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
     const { error } = await supabase.from(NOTIFICATIONS_TABLE).update({ 'is_read': read }).eq('id', id);

     if (error) {
          await logServerAction({ user_id, action: 'markNotificationRead', duration_ms: Date.now() - time, error: error.message, payload: { id, read }, status: 'fail', type: 'db' });
          return { success: false, error: error.message };
     }
     revalidatePath('/dashboard/');
     await logServerAction({ user_id, action: 'markNotificationRead', duration_ms: Date.now() - time, error: '', payload: { id, read }, status: 'success', type: 'db' });
     return { success: true };
}

export async function markAllNotificationsRead() {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null);
     const { error } = await supabase.from(NOTIFICATIONS_TABLE).update({ is_read: true }).eq('is_read', false);
     if (error) {
          await logServerAction({ user_id, action: 'markAllNotificationsRead', duration_ms: Date.now() - time, error: error.message, payload: {}, status: 'fail', type: 'db' });
          return { success: false, error: error.message };
     }
     await logServerAction({ user_id, action: 'markAllNotificationsRead', duration_ms: Date.now() - time, error: '', payload: {}, status: 'success', type: 'db' });
     revalidatePath('/dashboard/notifications');
     return { success: true };
}    
