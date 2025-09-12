"use server";

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { toStorageRef } from 'src/utils/sb-bucket';

const ANNOUNCEMENT_IMAGES_TABLE = 'tblAnnouncementImages';
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

// batch signer (bucket → [paths])
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
/**
 * Upload images for an announcement.
 * Path: clients/<auth.uid()>/announcements/<announcementId>/images/<filename>
 * Stores { storage_bucket, storage_path } and returns signed URLs for immediate use.
 */
export async function uploadAnnouncementImages(
     files: File[],
     announcementId: string,
     _client_name: string,               // kept for compat; not used
     _announcement_title?: string        // kept for compat; not used
): Promise<{ success: boolean; urls?: string[]; error?: string }> {
     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = getBucket();

     try {
          const { data: userData, error: userErr } = await supabase.auth.getUser();
          if (userErr || !userData?.user) {
               await logServerAction({
                    action: 'uploadAnnouncementImages',
                    duration_ms: 0,
                    error: userErr?.message ?? 'No session',
                    payload: { announcementId },
                    status: 'fail',
                    type: 'auth',
                    user_id: null
               });
               return { success: false, error: 'Not signed in' };
          }
          const uid = userData.user.id;

          const storagePaths: string[] = [];
          const seen = new Set<string>(); // dedupe paths within this request

          for (const file of files) {
               const storagePath = [
                    'clients',
                    uid, // RLS: user’s UUID as 2nd segment
                    'announcements',
                    announcementId,
                    'images',
                    sanitizeSegmentForS3(file.name),
               ].join('/');

               // skip duplicates in the same batch
               if (seen.has(storagePath)) continue;
               seen.add(storagePath);

               const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(storagePath, file, {
                         cacheControl: '3600',
                         upsert: true, // overwrite same path in Storage
                         contentType: (file as any)?.type || undefined,
                    });

               if (uploadError) {
                    await logServerAction({
                         action: 'uploadAnnouncementImages',
                         duration_ms: 0,
                         error: uploadError.message,
                         payload: { announcementId, bucket, storagePath },
                         status: 'fail',
                         type: 'db',
                         user_id: uid
                    });
                    return { success: false, error: uploadError.message };
               }

               // ✅ UPSERT on (announcement_id,storage_bucket,storage_path)
               const row = {
                    announcement_id: announcementId,
                    storage_bucket: bucket,
                    storage_path: storagePath,
               };
               const { error: upsertErr } = await supabase
                    .from(ANNOUNCEMENT_IMAGES_TABLE)
                    .upsert(row, {
                         onConflict: 'announcement_id,storage_bucket,storage_path',
                         // set to true to silently ignore if it already exists
                         ignoreDuplicates: true,
                    });

               if (upsertErr) {
                    await logServerAction({
                         action: 'insertAnnouncementImage',
                         duration_ms: 0,
                         error: upsertErr.message,
                         payload: { announcementId, storagePath },
                         status: 'fail',
                         type: 'db',
                         user_id: uid
                    });
                    return { success: false, error: upsertErr.message };
               }

               storagePaths.push(storagePath);
          }

          if (storagePaths.length === 0) {
               return { success: true, urls: [] };
          }

          // sign for immediate UI usage
          const { data: signedArr, error: signErr } = await supabase.storage
               .from(bucket)
               .createSignedUrls(storagePaths, SIGNED_URL_TTL_SECONDS);

          if (signErr || !signedArr) {
               await logServerAction({
                    action: 'uploadAnnouncementImages-sign',
                    duration_ms: 0,
                    error: signErr?.message ?? 'No signed URLs',
                    payload: { announcementId, count: storagePaths.length },
                    status: 'fail',
                    type: 'db',
                    user_id: null
               });
               return { success: false, error: 'Failed to create signed URLs' };
          }

          const urls = signedArr.map(x => x.signedUrl).filter(Boolean) as string[];

          revalidatePath('/dashboard/announcements');
          await logServerAction({
               action: 'uploadAnnouncementImages',
               duration_ms: 0,
               error: '',
               payload: { announcementId, count: urls.length },
               status: 'success',
               type: 'db',
               user_id: null
          });
          return { success: true, urls };
     } catch (e: any) {
          return { success: false, error: e.message };
     }
}

/** Remove a single announcement image by its file path or URL */
export async function removeAnnouncementImage(
     announcementId: string,
     filePathOrUrl: string
): Promise<{ success: boolean; error?: string }> {
     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = getBucket();

     try {
          // derive bucket+path from input; fallback to default bucket
          const ref = toStorageRef(filePathOrUrl) ?? { bucket, path: filePathOrUrl };
          const bkt = ref.bucket ?? bucket;
          const path = ref.path;

          // remove from Storage
          const { error: deleteError } = await supabase.storage.from(bkt).remove([path]);
          if (deleteError) return { success: false, error: deleteError.message };

          // delete DB row by new columns
          const { error: dbDeleteNewErr } = await supabase
               .from(ANNOUNCEMENT_IMAGES_TABLE)
               .delete()
               .match({ announcement_id: announcementId, storage_bucket: bkt, storage_path: path });

          if (dbDeleteNewErr) {
               const { error: dbDeleteLegacyErr } = await supabase
                    .from(ANNOUNCEMENT_IMAGES_TABLE)
                    .delete()
                    .match({ announcement_id: announcementId });
               if (dbDeleteLegacyErr) return { success: false, error: dbDeleteLegacyErr.message };
          }

          revalidatePath('/dashboard/announcements');
          return { success: true };
     } catch (e: any) {
          return { success: false, error: e.message };
     }
}

/** Remove all images for an announcement (Storage + DB) */
export async function removeAllAnnouncementImages(announcementId: string): Promise<{ success: boolean; error?: string }> {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data: images, error: imagesError } = await supabase
               .from(ANNOUNCEMENT_IMAGES_TABLE)
               .select('storage_bucket, storage_path')
               .eq('announcement_id', announcementId);

          if (imagesError) return { success: false, error: imagesError.message };
          if (!images?.length) return { success: true };

          // group by bucket;
          const byBucket = new Map<string, string[]>();
          for (const row of images) {
               let bkt = row.storage_bucket ?? getBucket();
               let pth = row.storage_path;

               if (!pth) continue;

               const arr = byBucket.get(bkt) ?? [];
               arr.push(pth);
               byBucket.set(bkt, arr);
          }

          // delete from Storage
          for (const [bkt, paths] of byBucket) {
               if (!paths.length) continue;
               const { error: removeError } = await supabase.storage.from(bkt).remove(paths);
               if (removeError) return { success: false, error: removeError.message };
          }

          // delete DB rows
          const { error: dbDeleteError } = await supabase
               .from(ANNOUNCEMENT_IMAGES_TABLE)
               .delete({ count: 'exact' })
               .eq('announcement_id', announcementId);

          if (dbDeleteError) return { success: false, error: dbDeleteError.message };

          revalidatePath('/dashboard/announcements');
          return { success: true };
     } catch (e: any) {
          return { success: false, error: e.message };
     }
}

/** Fetch signed image URLs for an announcement (storage refs only) */
export async function getAnnouncementImages(
     announcementId: string
): Promise<{ success: boolean; data?: string[]; error?: string }> {
     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase
          .from(ANNOUNCEMENT_IMAGES_TABLE)
          .select('storage_bucket, storage_path')
          .eq('announcement_id', announcementId);

     if (error) return { success: false, error: error.message };

     const defaultBucket = getBucket();

     // Build refs & dedupe
     const refs: Array<{ bucket: string; path: string }> = [];
     const seen = new Set<string>();
     for (const row of data ?? []) {
          const bucket = (row as any).storage_bucket ?? defaultBucket;
          const path = (row as any).storage_path as string | null;
          if (!path) continue;
          const key = `${bucket}::${path}`;
          if (seen.has(key)) continue;
          seen.add(key);
          refs.push({ bucket, path });
     }

     if (!refs.length) return { success: true, data: [] };

     // Batch sign (expects your existing signMany helper)
     const signedMap = await signMany(supabase, refs);
     const signedUrls = refs
          .map(r => signedMap.get(`${r.bucket}::${r.path}`))
          .filter(Boolean) as string[];

     return { success: true, data: signedUrls };
}
