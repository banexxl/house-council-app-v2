'use server';

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Notification } from 'src/types/notification';
import { validate as isUUID } from 'uuid';

const NOTIFICATIONS_TABLE = 'tblNotifications';

export async function getNotifications(): Promise<{ success: boolean; data?: Notification[]; error?: string; }> {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.from(NOTIFICATIONS_TABLE).select('*').order('created_at', { ascending: false });
     if (error) {
          await logServerAction({ user_id: null, action: 'getNotifications', duration_ms: Date.now() - time, error: error.message, payload: {}, status: 'fail', type: 'db' });
          return { success: false, error: error.message };
     }
     await logServerAction({ user_id: null, action: 'getNotifications', duration_ms: Date.now() - time, error: '', payload: { count: data?.length || 0 }, status: 'success', type: 'db' });
     return { success: true, data: data as Notification[] };
}

export async function getNotificationById(id: string) {
     const time = Date.now();
     if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.from(NOTIFICATIONS_TABLE).select('*').eq('id', id).single();
     if (error) {
          await logServerAction({ user_id: null, action: 'getNotificationById', duration_ms: Date.now() - time, error: error.message, payload: { id }, status: 'fail', type: 'db' });
          return { success: false, error: error.message };
     }
     await logServerAction({ user_id: null, action: 'getNotificationById', duration_ms: Date.now() - time, error: '', payload: { id }, status: 'success', type: 'db' });
     return { success: true, data: data as Notification };
}

export async function upsertNotification(input: Partial<Notification> & { id?: string }) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const isUpdate = !!input.id;
     const record: any = { ...input };
     if (!isUpdate) {
          record.created_at = new Date();
     }
     const { data, error } = await supabase.from(NOTIFICATIONS_TABLE).upsert(record, { onConflict: 'id' }).select().maybeSingle();
     console.log('error', error);

     if (error) {
          await logServerAction({ user_id: null, action: isUpdate ? 'updateNotification' : 'createNotification', duration_ms: Date.now() - time, error: error.message, payload: input, status: 'fail', type: 'db' });
          return { success: false, error: error.message };
     }
     await logServerAction({ user_id: null, action: isUpdate ? 'updateNotification' : 'createNotification', duration_ms: Date.now() - time, error: '', payload: input, status: 'success', type: 'db' });
     revalidatePath('/dashboard/notifications');
     return { success: true, data: data as Notification };
}

export async function deleteNotification(id: string) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { error } = await supabase.from(NOTIFICATIONS_TABLE).delete().eq('id', id);
     if (error) {
          await logServerAction({ user_id: null, action: 'deleteNotification', duration_ms: Date.now() - time, error: error.message, payload: { id }, status: 'fail', type: 'db' });
          return { success: false, error: error.message };
     }
     await logServerAction({ user_id: null, action: 'deleteNotification', duration_ms: Date.now() - time, error: '', payload: { id }, status: 'success', type: 'db' });
     revalidatePath('/dashboard/notifications');
     return { success: true };
}

export async function markNotificationRead(id: string, read: boolean) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { error } = await supabase.from(NOTIFICATIONS_TABLE).update({ read }).eq('id', id);
     if (error) {
          await logServerAction({ user_id: null, action: 'markNotificationRead', duration_ms: Date.now() - time, error: error.message, payload: { id, read }, status: 'fail', type: 'db' });
          return { success: false, error: error.message };
     }
     await logServerAction({ user_id: null, action: 'markNotificationRead', duration_ms: Date.now() - time, error: '', payload: { id, read }, status: 'success', type: 'db' });
     revalidatePath('/dashboard/notifications');
     return { success: true };
}
