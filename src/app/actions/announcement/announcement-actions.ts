'use server';

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { AnnouncementFormValues, AnnouncementStatus } from 'src/types/announcement';
import { validate as isUUID } from 'uuid';

// Table names (adjust if different in your DB schema)
const ANNOUNCEMENTS_TABLE = 'tblAnnouncements';

export interface AnnouncementRecord extends Omit<AnnouncementFormValues, 'attachments' | 'status' | 'schedule_enabled'> {
     id?: string;
     status: AnnouncementStatus;
     created_at?: string | Date;
     updated_at?: string | Date;
     published_at?: string | Date | null;
     pinned?: boolean;
     archived?: boolean;
     attachments?: string[]; // store URLs/paths
}

// ============================= READ OPERATIONS =============================
export async function getAnnouncements(): Promise<{ success: boolean; error?: string; data?: AnnouncementRecord[] }> {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase.from(ANNOUNCEMENTS_TABLE).select('*').order('created_at', { ascending: false });
     if (error) {
          await logServerAction({
               user_id: null,
               action: 'getAnnouncements',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: {},
               status: 'fail',
               type: 'db'
          });
          return { success: false, error: error.message };
     }
     await logServerAction({
          user_id: null, action: 'getAnnouncements', duration_ms: Date.now() - time, error: '', payload: {}, status: 'success', type: 'db'
     });
     return { success: true, data: data as AnnouncementRecord[] };
}

export async function getAnnouncementById(id: string): Promise<{ success: boolean; error?: string; data?: AnnouncementRecord }> {
     const time = Date.now();
     if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.from(ANNOUNCEMENTS_TABLE).select('*').eq('id', id).single();
     if (error) {
          await logServerAction({
               user_id: null,
               action: 'getAnnouncementById',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id },
               status: 'fail',
               type: 'db',

               id: ''
          });
          return { success: false, error: error.message };
     }
     await logServerAction({
          user_id: null,
          action: 'getAnnouncementById',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id },
          status: 'success',
          type: 'db',

          id: ''
     });
     return { success: true, data: data as AnnouncementRecord };
}

// ============================= CREATE / UPDATE =============================
export async function upsertAnnouncement(input: Partial<AnnouncementRecord> & { id?: string }) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const now = new Date();
     const isUpdate = !!input.id;
     const record: any = { ...input };

     if (isUpdate) {
          record.updated_at = now;
     } else {
          record.created_at = now;
          record.updated_at = now;
          if (record.status === 'published') {
               record.published_at = now;
          } else {
               record.published_at = null;
          }
     }

     // Remove fields that shouldn't be persisted directly
     delete record.schedule_enabled; // UI only flag
     // Normalise field names coming from the client form
     if (typeof record.pin !== 'undefined') {
          record.pinned = record.pin; // DB column is 'pinned'
          delete record.pin;
     }
     if (typeof record.scheduleAt !== 'undefined') {
          record.schedule_at = record.scheduleAt; // assume DB column schedule_at
          delete record.scheduleAt;
     }

     const { data, error } = await supabase
          .from(ANNOUNCEMENTS_TABLE)
          .upsert(record, { onConflict: 'id' })
          .select()
          .maybeSingle();

     if (error) {
          await logServerAction({
               action: isUpdate ? 'updateAnnouncement' : 'createAnnouncement',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: input,
               status: 'fail',
               type: 'db',
               user_id: null
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          user_id: null,
          action: isUpdate ? 'updateAnnouncement' : 'createAnnouncement',
          duration_ms: Date.now() - time,
          error: '',
          payload: input,
          status: 'success',
          type: 'db',
     });
     revalidatePath('/dashboard/announcements');
     return { success: true, data: data as AnnouncementRecord };
}

// ============================= DELETE =============================
export async function deleteAnnouncement(id: string) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { error } = await supabase.from(ANNOUNCEMENTS_TABLE).delete().eq('id', id);

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'deleteAnnouncement',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }
     await logServerAction({
          user_id: null,
          action: 'deleteAnnouncement',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id },
          status: 'success',
          type: 'db',
     });
     revalidatePath('/dashboard/announcements');
     return { success: true, data: null };
}

// ============================= PIN =============================
export async function togglePinAction(id: string, pinned: boolean) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { error } = await supabase.from(ANNOUNCEMENTS_TABLE).update({ pinned, updated_at: new Date() }).eq('id', id);
     if (error) {
          await logServerAction({
               user_id: null,
               action: 'togglePinAnnouncement',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id, pinned },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }
     await logServerAction({
          user_id: null,
          action: 'togglePinAnnouncement',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id, pinned },
          status: 'success',
          type: 'db',
     });
     revalidatePath('/dashboard/announcements');
     return { success: true };
}

// ============================= PUBLISH STATUS CHANGE =============================
export async function publishAnnouncement(id: string) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const now = new Date();
     const { error } = await supabase.from(ANNOUNCEMENTS_TABLE).update({ status: 'published', published_at: now, updated_at: now }).eq('id', id);
     if (error) {
          await logServerAction({
               user_id: null,
               action: 'publishAnnouncement',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }
     await logServerAction({
          user_id: null,
          action: 'publishAnnouncement',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id },
          status: 'success',
          type: 'db',
     });
     revalidatePath('/dashboard/announcements');
     return { success: true };
}

export async function revertToDraft(id: string) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { error } = await supabase.from(ANNOUNCEMENTS_TABLE).update({ status: 'draft', published_at: null, updated_at: new Date() }).eq('id', id);
     if (error) {
          await logServerAction({
               user_id: null,
               action: 'revertAnnouncementToDraft',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }
     await logServerAction({
          user_id: null,
          action: 'revertAnnouncementToDraft',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id },
          status: 'success',
          type: 'db',
     });
     revalidatePath('/dashboard/announcements');
     return { success: true };
}
