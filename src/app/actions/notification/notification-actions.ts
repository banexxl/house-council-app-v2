'use server';

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Notification } from 'src/types/notification';
import { validate as isUUID } from 'uuid';

const NOTIFICATIONS_TABLE = 'tblNotifications';


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

export async function upsertNotification(input: Partial<Notification> & { id?: string }) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null);
     const isUpdate = !!input.id;
     const record: any = { ...input };
     if (!isUpdate) {
          record.created_at = new Date();
     }
     const { data, error } = await supabase.from(NOTIFICATIONS_TABLE).upsert(record, { onConflict: 'id' }).select().maybeSingle();
     if (error) {
          await logServerAction({ user_id, action: isUpdate ? 'updateNotification' : 'createNotification', duration_ms: Date.now() - time, error: error.message, payload: input, status: 'fail', type: 'db' });
          return { success: false, error: error.message };
     }
     revalidatePath('/dashboard/');
     await logServerAction({ user_id, action: isUpdate ? 'updateNotification' : 'createNotification', duration_ms: Date.now() - time, error: '', payload: input, status: 'success', type: 'db' });
     return { success: true, data: data as Notification };
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
     console.log('id, read', id, read);

     const { error } = await supabase.from(NOTIFICATIONS_TABLE).update({ is_read: read }).eq('id', id);
     console.log('error', error);

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
