"use server";

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { toStorageRef } from 'src/utils/sb-bucket';

const ANNOUNCEMENT_DOCUMENTS_TABLE = 'tblAnnouncementDocuments';
const getBucket = () => process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1h

const sanitizeSegmentForS3 = (segment: string): string => {
     return segment
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9-_.]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '');
};

// Batch signer
async function signMany(
     supabase: Awaited<ReturnType<typeof useServerSideSupabaseAnonClient>>,
     refs: Array<{ bucket: string; path: string }>
) {
     const byBucket = new Map<string, string[]>();
     refs.forEach(r => {
          const arr = byBucket.get(r.bucket) ?? [];
          arr.push(r.path);
          byBucket.set(r.bucket, arr);
     });

     const out = new Map<string, string>();
     for (const [bucket, paths] of byBucket) {
          if (!paths.length) continue;
          const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
          if (error) continue;
          data?.forEach((d, i) => {
               if (d?.signedUrl) out.set(`${bucket}::${paths[i]}`, d.signedUrl);
          });
     }
     return out;
}

// ===== Validation =====
const ALLOWED_DOC_EXTENSIONS: Record<string, string> = {
     pdf: 'application/pdf',
     doc: 'application/msword',
     docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     xls: 'application/vnd.ms-excel',
     xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
     csv: 'text/csv',
     txt: 'text/plain',
     ppt: 'application/vnd.ms-powerpoint',
     pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
     odt: 'application/vnd.oasis.opendocument.text',
     ods: 'application/vnd.oasis.opendocument.spreadsheet',
     zip: 'application/zip',
};
const SAFE_CONTENT_TYPES = new Set([
     'application/pdf',
     'application/msword',
     'application/vnd.ms-excel',
     'text/csv',
     'text/plain',
     'application/vnd.ms-powerpoint',
     'application/zip',
     'application/octet-stream',
]);
const MAX_DOC_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

/**
 * Upload announcement documents.
 * Path: clients/<auth.uid()>/announcements/<announcementId>/docs/<filename>
 * Stores refs and returns signed URLs for immediate use.
 */
export async function uploadAnnouncementDocuments(
     files: File[],
     announcementId: string,
     _client_name: string,           // kept for compat; not used
     _announcement_title?: string    // kept for compat; not used
): Promise<{ success: boolean; urls?: { url: string; name: string; mime: string }[]; error?: string }> {
     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = getBucket();
     const urls: { url: string; name: string; mime: string }[] = [];

     try {
          const { data: userData, error: userErr } = await supabase.auth.getUser();
          if (userErr || !userData?.user) {
               await logServerAction({ action: 'uploadAnnouncementDocuments', duration_ms: 0, error: userErr?.message ?? 'No session', payload: { announcementId }, status: 'fail', type: 'auth', user_id: null });
               return { success: false, error: 'Not signed in' };
          }
          const uid = userData.user.id;

          const storagePaths: string[] = [];

          for (const file of files) {
               const originalName = file.name;
               const ext = (originalName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]) || '';
               if (!ext || !ALLOWED_DOC_EXTENSIONS[ext]) {
                    return { success: false, error: `File type not allowed: ${originalName}` };
               }
               if ((file as any).size && (file as any).size > MAX_DOC_SIZE_BYTES) {
                    return { success: false, error: `File too large (> ${Math.floor(MAX_DOC_SIZE_BYTES / (1024 * 1024))}MB): ${originalName}` };
               }

               const mimeFromExt = ALLOWED_DOC_EXTENSIONS[ext];
               const finalMime = (file as any).type && (file as any).type !== '' ? (file as any).type : mimeFromExt;

               const storagePath = [
                    'clients',
                    uid,                            // 👈 RLS: user’s UUID
                    'announcements',
                    announcementId,
                    'docs',
                    sanitizeSegmentForS3(originalName),
               ].join('/');

               // Content-Type handling (OOXML fallback to octet-stream)
               const isOOXML = /vnd\.openxmlformats-officedocument/.test(finalMime);
               let uploadErr: any = null;

               if (isOOXML && !SAFE_CONTENT_TYPES.has(finalMime)) {
                    const { error: firstErr } = await supabase.storage.from(bucket).upload(storagePath, file, {
                         cacheControl: '3600', upsert: true, contentType: finalMime,
                    });
                    if (firstErr) {
                         const { error: secondErr } = await supabase.storage.from(bucket).upload(storagePath, file, {
                              cacheControl: '3600', upsert: true, contentType: 'application/octet-stream',
                         });
                         uploadErr = secondErr;
                    }
               } else {
                    const chosen = SAFE_CONTENT_TYPES.has(finalMime) ? finalMime : 'application/octet-stream';
                    const { error } = await supabase.storage.from(bucket).upload(storagePath, file, {
                         cacheControl: '3600', upsert: true, contentType: chosen,
                    });
                    uploadErr = error;
               }

               if (uploadErr) {
                    await logServerAction({ action: 'uploadAnnouncementDocuments', duration_ms: 0, error: uploadErr.message, payload: { announcementId, file: originalName }, status: 'fail', type: 'storage', user_id: uid });
                    return { success: false, error: uploadErr.message };
               }

               const { error: upsertErr } = await supabase
                    .from(ANNOUNCEMENT_DOCUMENTS_TABLE)
                    .upsert(
                         {
                              announcement_id: announcementId,
                              storage_bucket: bucket,
                              storage_path: storagePath,
                              file_name: originalName,
                              mime_type: finalMime,
                         },
                         {
                              onConflict: 'announcement_id,storage_bucket,storage_path',
                              // set to true to quietly skip duplicates,
                              // or leave false to update metadata if file_name/mime changes
                              ignoreDuplicates: false,
                         }
                    );

               if (upsertErr) {
                    await logServerAction({ action: 'insertAnnouncementDocument', duration_ms: 0, error: upsertErr.message, payload: { announcementId }, status: 'fail', type: 'db', user_id: uid });
                    return { success: false, error: upsertErr.message };
               }

               storagePaths.push(storagePath);
          }

          // Sign for UI
          const { data: signedArr, error: signErr } = await supabase.storage
               .from(bucket)
               .createSignedUrls(storagePaths, SIGNED_URL_TTL_SECONDS);
          if (signErr || !signedArr) {
               await logServerAction({ action: 'uploadAnnouncementDocuments-sign', duration_ms: 0, error: signErr?.message ?? 'No signed URLs', payload: { announcementId, count: storagePaths.length }, status: 'fail', type: 'storage', user_id: null });
               return { success: false, error: 'Failed to create signed URLs' };
          }

          for (let i = 0; i < signedArr.length; i++) {
               const signedUrl = signedArr[i]?.signedUrl;
               if (signedUrl) {
                    // keep same return structure as before but with signed URL
                    const name = files[i]?.name ?? 'file';
                    const ext = (name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]) || '';
                    const mime = ALLOWED_DOC_EXTENSIONS[ext] ?? 'application/octet-stream';
                    urls.push({ url: signedUrl, name, mime });
               }
          }

          revalidatePath('/dashboard/announcements');
          await logServerAction({ action: 'uploadAnnouncementDocuments', duration_ms: 0, error: '', payload: { announcementId, count: urls.length }, status: 'success', type: 'db', user_id: null });
          return { success: true, urls };
     } catch (e: any) {
          return { success: false, error: e.message };
     }
}

/** Return rows with fresh signed URLs in `document_url` (no legacy column needed). */
export async function getAnnouncementDocuments(
     announcementId: string
): Promise<{
     success: boolean;
     data?: { id?: string; announcement_id: string; document_url: string; file_name: string; mime_type?: string }[];
     error?: string;
}> {
     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase
          .from(ANNOUNCEMENT_DOCUMENTS_TABLE)
          .select('id, announcement_id, storage_bucket, storage_path, file_name, mime_type')
          .eq('announcement_id', announcementId);

     if (error) return { success: false, error: error.message };
     if (!data?.length) return { success: true, data: [] };

     // Build refs from storage fields only
     const refs = data
          .map(row => {
               if (!row.storage_path) return null;
               return { bucket: row.storage_bucket ?? getBucket(), path: row.storage_path };
          })
          .filter(Boolean) as Array<{ bucket: string; path: string }>;

     const signedMap = await signMany(supabase, refs);

     // Map back with signed URLs in `document_url`
     const rows = data.map(row => {
          const bucket = row.storage_bucket ?? getBucket();
          const path = row.storage_path;
          const key = path ? `${bucket}::${path}` : null;
          const signed = key ? signedMap.get(key) : null;

          return {
               id: row.id,
               announcement_id: row.announcement_id,
               document_url: signed ?? '',            // always prefer fresh signed URL
               file_name: row.file_name,
               mime_type: row.mime_type,
          };
     });

     return { success: true, data: rows };
}

/** Remove single document by storage path or signed/public URL. */
export async function removeAnnouncementDocument(
     announcementId: string,
     filePathOrUrl: string
): Promise<{ success: boolean; error?: string }> {
     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = getBucket();

     try {
          // Accept either a signed/public URL or a raw storage path
          const ref = toStorageRef(filePathOrUrl) ?? { bucket, path: filePathOrUrl };
          const bkt = ref.bucket ?? bucket;
          const path = ref.path;

          const { error: deleteError } = await supabase.storage.from(bkt).remove([path]);
          if (deleteError) return { success: false, error: deleteError.message };

          // Delete by storage reference only (no legacy document_url)
          const { error: dbDelErr } = await supabase
               .from(ANNOUNCEMENT_DOCUMENTS_TABLE)
               .delete({ count: 'exact' })
               .match({ announcement_id: announcementId, storage_bucket: bkt, storage_path: path });

          if (dbDelErr) return { success: false, error: dbDelErr.message };

          revalidatePath('/dashboard/announcements');
          return { success: true };
     } catch (e: any) {
          return { success: false, error: e.message };
     }
}

/** Remove all documents for an announcement, both storage and DB rows. */
export async function removeAllAnnouncementDocuments(
     announcementId: string
): Promise<{ success: boolean; error?: string }> {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data: docs, error: docsErr } = await supabase
               .from(ANNOUNCEMENT_DOCUMENTS_TABLE)
               .select('storage_bucket, storage_path')
               .eq('announcement_id', announcementId);

          if (docsErr) return { success: false, error: docsErr.message };
          if (!docs?.length) return { success: true };

          // Group storage paths by bucket
          const byBucket = new Map<string, string[]>();
          for (const row of docs) {
               const bkt = (row as any).storage_bucket ?? getBucket();
               const pth = (row as any).storage_path as string | null;
               if (!pth) continue;
               const arr = byBucket.get(bkt) ?? [];
               arr.push(pth);
               byBucket.set(bkt, arr);
          }

          // Remove objects from Storage
          for (const [bkt, paths] of byBucket) {
               if (!paths.length) continue;
               const { error: removeError } = await supabase.storage.from(bkt).remove(paths);
               if (removeError) return { success: false, error: removeError.message };
          }

          // Delete DB rows
          const { error: dbDeleteError } = await supabase
               .from(ANNOUNCEMENT_DOCUMENTS_TABLE)
               .delete({ count: 'exact' })
               .eq('announcement_id', announcementId);

          if (dbDeleteError) return { success: false, error: dbDeleteError.message };

          revalidatePath('/dashboard/announcements');
          return { success: true };
     } catch (e: any) {
          return { success: false, error: e.message };
     }
}

