'use server';

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Announcement, AnnouncementStatus } from 'src/types/announcement';
import { BaseNotification, Notification } from 'src/types/notification';
import { validate as isUUID } from 'uuid';

// Table names (adjust if different in your DB schema)
const ANNOUNCEMENTS_TABLE = 'tblAnnouncements';

// ============================= READ OPERATIONS =============================
export async function getAnnouncements(): Promise<{ success: boolean; error?: string; data?: Announcement[] }> {
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

     // Attach images for all announcements in a single additional query
     let enriched: Announcement[] = data as Announcement[];
     try {
          const ids = enriched.map(a => a.id).filter(Boolean);
          if (ids.length > 0) {
               const { data: imgRows, error: imgErr } = await supabase
                    .from('tblAnnouncementImages')
                    .select('announcement_id,image_url')
                    .in('announcement_id', ids as string[]);
               if (!imgErr && imgRows) {
                    const map = new Map<string, string[]>();
                    for (const row of imgRows) {
                         const annId = (row as any).announcement_id as string;
                         const url = (row as any).image_url as string;
                         if (!map.has(annId)) map.set(annId, []);
                         map.get(annId)!.push(url);
                    }
                    enriched = enriched.map(a => ({ ...a, images: map.get(a.id!) || [] }));
               }
               // Documents enrichment
               const { data: docRows, error: docErr } = await supabase
                    .from('tblAnnouncementDocuments')
                    .select('announcement_id,document_url,file_name,mime_type')
                    .in('announcement_id', ids as string[]);
               if (!docErr && docRows) {
                    const docMap = new Map<string, { url: string; name: string; mime?: string }[]>();
                    for (const row of docRows as any[]) {
                         const annId = row.announcement_id as string;
                         const doc = { url: row.document_url as string, name: row.file_name as string, mime: row.mime_type as string | undefined };
                         if (!docMap.has(annId)) docMap.set(annId, []);
                         docMap.get(annId)!.push(doc);
                    }
                    enriched = enriched.map(a => ({ ...a, documents: (docMap.get(a.id!) || []) }));
               }
          }
     } catch { /* ignore image enrichment errors */ }

     await logServerAction({
          user_id: null, action: 'getAnnouncements', duration_ms: Date.now() - time, error: '', payload: { count: enriched.length }, status: 'success', type: 'db'
     });
     return { success: true, data: enriched };
}

export async function getAnnouncementById(id: string): Promise<{ success: boolean; error?: string; data?: Announcement }> {
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
     // Fetch related images & documents (ignore errors to not block primary response)
     let images: string[] = [];
     let documents: { url: string; name: string; mime?: string }[] = [];
     try {
          const { data: imgRows } = await supabase.from('tblAnnouncementImages').select('image_url').eq('announcement_id', id);
          images = (imgRows || []).map(r => (r as any).image_url);
     } catch { /* noop */ }
     try {
          const { data: docRows } = await supabase.from('tblAnnouncementDocuments').select('document_url,file_name,mime_type').eq('announcement_id', id);
          documents = (docRows || []).map(r => ({ url: (r as any).document_url, name: (r as any).file_name, mime: (r as any).mime_type || undefined }));
     } catch { /* noop */ }

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
     const record: Announcement = { ...(data as any), images, documents };
     return { success: true, data: record };
}

// ============================= CREATE / UPDATE =============================
export async function upsertAnnouncement(input: Partial<Announcement> & { id?: string }) {

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

     const { data, error } = await supabase
          .from(ANNOUNCEMENTS_TABLE)
          .upsert(record, { onConflict: 'id' })
          .select()
          .maybeSingle<Announcement>();

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

     // Create notification ONLY on new announcement insert (not on updates)
     if (!isUpdate && data) {
          try {
               // Best-effort notification insert; ignore failure to not block announcement creation
               const notification = {
                    type: 'announcement',
                    title: data.title,
                    description: data.title || 'A new announcement was created',
                    created_at: new Date(),
                    user_id: data?.user_id ?? null,
                    is_read: false
               } as BaseNotification;
               const { error: notifErr } = await supabase.from('tblNotifications').insert(notification);
               if (notifErr) {
                    console.error('[announce->notification] insert failed', notifErr.message);
               }
          } catch (e: any) {
               console.error('[announce->notification] unexpected error', e?.message || e);
          }
     }
     revalidatePath('/dashboard/announcements');
     return { success: true, data: data as Announcement };
}

// ============================= DELETE/ARCHIVE =============================
export async function deleteAnnouncement(id: string) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { error } = await supabase.from(ANNOUNCEMENTS_TABLE).delete().eq('id', id);
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null).catch(() => null);
     if (error) {
          await logServerAction({
               user_id: user_id ? user_id : null,
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
          user_id: user_id ? user_id : null,
          action: 'deleteAnnouncement',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id },
          status: 'success',
          type: 'db',
     });
     // Fire-and-forget notification about deletion
     try {
          const notification = {
               type: 'announcement',
               title: 'Announcement deleted',
               description: `Announcement ${id} was deleted`,
               created_at: new Date(),
               user_id: user_id ? user_id : null,
               is_read: false
          } as BaseNotification;
          const { error: notifErr } = await supabase.from('tblNotifications').insert(notification);
          if (notifErr) console.error('[announce->notification] delete insert failed', notifErr.message);
     } catch (e: any) {
          console.error('[announce->notification] delete unexpected error', e?.message || e);
     }
     revalidatePath('/dashboard/announcements');
     return { success: true, data: null };
}

export async function archiveAnnouncement(id: string) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null).catch(() => null);
     const { error } = await supabase.from(ANNOUNCEMENTS_TABLE).update({ archived: true, updated_at: new Date() }).eq('id', id);
     if (error) {
          await logServerAction({
               user_id: user_id ? user_id : null,
               action: 'archiveAnnouncement',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }
     await logServerAction({
          user_id: user_id ? user_id : null,
          action: 'archiveAnnouncement',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id },
          status: 'success',
          type: 'db',
     });
     revalidatePath('/dashboard/announcements');
     return { success: true };
}

// ============================= PIN =============================
export async function togglePinAction(id: string, pinned: boolean) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null).catch(() => null);
     const { error } = await supabase.from(ANNOUNCEMENTS_TABLE).update({ pinned, updated_at: new Date() }).eq('id', id);
     if (error) {
          await logServerAction({
               user_id: user_id ? user_id : null,
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
          user_id: user_id ? user_id : null,
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
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null).catch(() => null);
     const now = new Date();
     const { error } = await supabase.from(ANNOUNCEMENTS_TABLE).update({ status: 'published', published_at: now, updated_at: now }).eq('id', id);
     if (error) {
          await logServerAction({
               user_id: user_id ? user_id : null,
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
          user_id: user_id ? user_id : null,
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
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null).catch(() => null);
     const { error } = await supabase.from(ANNOUNCEMENTS_TABLE).update({ status: 'draft', published_at: null, updated_at: new Date() }).eq('id', id);
     if (error) {
          await logServerAction({
               user_id: user_id ? user_id : null,
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

// ============================= ARCHIVE / UNARCHIVE =============================
export async function toggleArchiveAction(id: string, archived: boolean) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const user_id = await supabase.auth.getUser().then(res => res.data.user?.id || null).catch(() => null);
     const { error } = await supabase.from(ANNOUNCEMENTS_TABLE).update({ archived, updated_at: new Date() }).eq('id', id);
     if (error) {
          await logServerAction({
               user_id: user_id ? user_id : null,
               action: 'toggleArchiveAnnouncement',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id, archived },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }
     await logServerAction({
          user_id: user_id ? user_id : null,
          action: 'toggleArchiveAnnouncement',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id, archived },
          status: 'success',
          type: 'db',
     });
     revalidatePath('/dashboard/announcements');
     return { success: true };
}
