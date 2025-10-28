"use server";

import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { revalidatePath } from 'next/cache';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { toStorageRef } from 'src/utils/sb-bucket';
import { PollAttachment } from 'src/types/poll';

const ATTACHMENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_TBL_POLL_ATTACHMENTS || 'tblPollAttachments';
const DEFAULT_BUCKET = process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

// Aligned with sb-storage.ts
const sanitizeSegmentForS3 = (segment: string): string => {
     return segment
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9-_.]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '');
};

export async function getAttachments(poll_id: string): Promise<{ success: boolean; error?: string; data?: PollAttachment[] }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.from(ATTACHMENTS_TABLE).select('*').eq('poll_id', poll_id).order('uploaded_at', { ascending: false });
     if (error) {
          await logServerAction({ action: 'getAttachments', duration_ms: Date.now() - t0, error: error.message, payload: { poll_id }, status: 'fail', type: 'db', user_id: null });
          return { success: false, error: error.message };
     }
     await logServerAction({ action: 'getAttachments', duration_ms: Date.now() - t0, error: '', payload: { poll_id, count: data?.length ?? 0 }, status: 'success', type: 'db', user_id: null });
     return { success: true, data: (data ?? []) as PollAttachment[] };
}

export async function addAttachment(attachment: PollAttachment): Promise<{ success: boolean; error?: string; data?: PollAttachment }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.from(ATTACHMENTS_TABLE).insert([attachment]).select().single();
     if (error) {
          await logServerAction({ action: 'addAttachment', duration_ms: Date.now() - t0, error: error.message, payload: { attachment }, status: 'fail', type: 'db', user_id: null });
          return { success: false, error: error.message };
     }
     await logServerAction({ action: 'addAttachment', duration_ms: Date.now() - t0, error: '', payload: { id: data?.id }, status: 'success', type: 'db', user_id: null });
     return { success: true, data: data as PollAttachment };
}

export async function updateAttachment(id: string, update: PollAttachment): Promise<{ success: boolean; error?: string; data?: PollAttachment }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.from(ATTACHMENTS_TABLE).update(update).eq('id', id).select().single();
     if (error) {
          await logServerAction({ action: 'updateAttachment', duration_ms: Date.now() - t0, error: error.message, payload: { id, update }, status: 'fail', type: 'db', user_id: null });
          return { success: false, error: error.message };
     }
     await logServerAction({ action: 'updateAttachment', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db', user_id: null });
     return { success: true, data: data as PollAttachment };
}

export async function deleteAttachment(id: string): Promise<{ success: boolean; error?: string }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { error } = await supabase.from(ATTACHMENTS_TABLE).delete().eq('id', id);
     if (error) {
          await logServerAction({ action: 'deleteAttachment', duration_ms: Date.now() - t0, error: error.message, payload: { id }, status: 'fail', type: 'db', user_id: null });
          return { success: false, error: error.message };
     }
     await logServerAction({ action: 'deleteAttachment', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db', user_id: null });
     return { success: true };
}

// Upload images to Storage and create rows in tblPollAttachments.
// Path: clients/<clientId>/polls/<pollId>/images/<file>
export async function uploadPollImagesAndGetUrls(
     files: File[],
     clientId: string,
     pollId: string
): Promise<{ success: boolean; urls?: string[]; error?: string }> {
     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = DEFAULT_BUCKET;

     try {
          const { data: userData, error: userErr } = await supabase.auth.getUser();
          if (userErr || !userData?.user) {
               await logServerAction({ action: 'uploadPollImages - No auth', duration_ms: 0, error: userErr?.message ?? 'No user', payload: { pollId }, status: 'fail', type: 'auth', user_id: null });
               return { success: false, error: 'Not signed in' };
          }
          const uid = userData.user.id;

          const storagePaths: string[] = [];
          for (const file of files) {
               const storagePath = ['clients', clientId, 'polls', pollId, 'images', sanitizeSegmentForS3(file.name)].join('/');
               const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(storagePath, file, { cacheControl: '3600', upsert: true });
               if (uploadError) {
                    await logServerAction({ action: 'uploadPollImages - Storage upload failed', duration_ms: 0, error: uploadError.message, payload: { bucket, storagePath }, status: 'fail', type: 'db', user_id: uid });
                    return { success: false, error: `${uploadError.message} for file ${file.name}` };
               }

               const row: PollAttachment = {
                    poll_id: pollId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    storage_bucket: bucket,
                    storage_path: storagePath,
                    is_cover_image: false
               }
               const { error: insertErr } = await supabase.from(ATTACHMENTS_TABLE).insert(row);
               if (insertErr) {
                    await logServerAction({ action: 'uploadPollImages - DB insert failed', duration_ms: 0, error: insertErr.message, payload: { pollId, storagePath }, status: 'fail', type: 'db', user_id: uid });
                    return { success: false, error: insertErr.message };
               }

               storagePaths.push(storagePath);
          }

          const { data: signedArr, error: signErr } = await supabase.storage
               .from(bucket)
               .createSignedUrls(storagePaths, SIGNED_URL_TTL_SECONDS);
          if (signErr || !signedArr) {
               await logServerAction({ action: 'uploadPollImages - signing failed', duration_ms: 0, error: signErr?.message ?? 'No signed URLs', payload: { count: storagePaths.length }, status: 'fail', type: 'db', user_id: uid });
               return { success: false, error: 'Failed to create signed URLs' };
          }

          const urls = signedArr.map(s => s.signedUrl).filter(Boolean) as string[];
          await logServerAction({ action: 'uploadPollImages - success', duration_ms: 0, error: '', payload: { count: urls.length }, status: 'success', type: 'db', user_id: uid });
          revalidatePath(`/dashboard/polls/${pollId}`);
          return { success: true, urls };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
}

// Remove a file from Storage and delete its attachment row.
export async function removePollAttachmentFilePath(
     pollId: string,
     filePathOrUrl: string
): Promise<{ success: boolean; error?: string }> {
     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = DEFAULT_BUCKET;

     try {
          const ref = toStorageRef(filePathOrUrl) ?? { bucket, path: filePathOrUrl };
          const { bucket: bkt, path } = ref as { bucket: string; path: string };

          const { error: deleteError } = await supabase.storage.from(bkt).remove([path]);
          if (deleteError) {
               await logServerAction({ action: 'removePollAttachment - storage delete failed', duration_ms: 0, error: deleteError.message, payload: { pollId, path }, status: 'fail', type: 'db', user_id: null });
               return { success: false, error: deleteError.message };
          }

          // Try delete by original string, then by normalized path
          let dbErrMsg: string | null = null;
          const { error: dbErr1 } = await supabase.from(ATTACHMENTS_TABLE).delete().match({ poll_id: pollId, });
          if (dbErr1) {
               const { error: dbErr2 } = await supabase.from(ATTACHMENTS_TABLE).delete().match({ poll_id: pollId, storage_path: path });
               if (dbErr2) dbErrMsg = dbErr2.message;
          }
          if (dbErrMsg) {
               await logServerAction({ action: 'removePollAttachment - DB delete failed', duration_ms: 0, error: dbErrMsg, payload: { pollId, path }, status: 'fail', type: 'db', user_id: null });
               return { success: false, error: dbErrMsg };
          }

          await logServerAction({ action: 'removePollAttachment - success', duration_ms: 0, error: '', payload: { pollId, path }, status: 'success', type: 'db', user_id: null });
          revalidatePath(`/dashboard/polls/${pollId}`);
          return { success: true };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
}

// Remove all attachments for a poll (storage + DB rows).
export async function removeAllPollAttachments(pollId: string): Promise<{ success: boolean; error?: string }> {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data: rows, error: readErr } = await supabase
               .from(ATTACHMENTS_TABLE)
               .select('storage_path')
               .eq('poll_id', pollId);
          if (readErr) return { success: false, error: readErr.message };

          const toDelete = (rows || []).map(r => toStorageRef(r.storage_path) ?? { bucket: DEFAULT_BUCKET, path: r.storage_path });

          const groups = new Map<string, string[]>();
          for (const ref of toDelete) {
               if (!ref?.path) continue;
               const arr = groups.get(ref.bucket) ?? [];
               arr.push(ref.path);
               groups.set(ref.bucket, arr);
          }

          for (const [bkt, paths] of groups) {
               if (!paths.length) continue;
               const { error: delErr } = await supabase.storage.from(bkt).remove(paths);
               if (delErr) return { success: false, error: delErr.message };
          }

          const { error: dbErr } = await supabase
               .from(ATTACHMENTS_TABLE)
               .delete()
               .eq('poll_id', pollId);
          if (dbErr) return { success: false, error: dbErr.message };

          revalidatePath(`/dashboard/polls/${pollId}`);
          return { success: true };
     } catch (e: any) {
          return { success: false, error: e?.message || 'Unexpected error' };
     }
}
