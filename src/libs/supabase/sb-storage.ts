'use server';

import { revalidatePath } from "next/cache";
import { useServerSideSupabaseAnonClient } from "./sb-server";
import { logServerAction } from "./server-logging";
import { toStorageRef } from "src/utils/sb-bucket";

const DEFAULT_BUCKET = process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;

// Helper to sanitize file paths for S3
const sanitizeSegmentForS3 = (segment: string): string => {
     return segment
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9-_.]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '');
};

/**
 * Uploads one or more images to Supabase Storage and links them to a building in `tblBuildingImages`
 */
export const uploadBuildingImagesAndGetUrls = async (
     files: File[],
     client: string,          // kept for backward compatibility; not used
     buildingId: string
): Promise<{ success: boolean; urls?: string[]; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;
     const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

     try {
          // Require an authenticated user (auth.uid()) for RLS path checks
          const { data: userData, error: userErr } = await supabase.auth.getUser();
          if (userErr || !userData?.user) {
               await logServerAction({
                    action: 'Upload Image - Missing auth user',
                    duration_ms: 0,
                    error: userErr?.message ?? 'No user in session',
                    payload: { buildingId },
                    status: 'fail',
                    type: 'auth',
                    user_id: null,
               });
               return { success: false, error: 'Not signed in' };
          }
          const uid = userData.user.id;

          // Upload all files and collect storage paths
          const storagePaths: string[] = [];

          for (const singleFile of files) {
               const storagePath = [
                    'clients',
                    client,
                    'buildings',
                    buildingId,
                    'images',
                    sanitizeSegmentForS3(singleFile.name),
               ].join('/');

               const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(storagePath, singleFile, {
                         cacheControl: '3600',
                         upsert: true, // requires your UPDATE policy (you have it)
                    });

               if (uploadError) {
                    await logServerAction({
                         action: 'Upload Image - Failed to upload to Storage',
                         duration_ms: 0,
                         error: uploadError.message,
                         payload: { bucket, storagePath },
                         status: 'fail',
                         type: 'db',
                         user_id: uid,
                    });
                    return { success: false, error: `${uploadError.message} for file ${singleFile.name}` };
               }

               // Store bucket + path in DB (not a signed URL)
               const { error: insertError } = await supabase
                    .from('tblBuildingImages')
                    .insert({
                         building_id: buildingId,
                         storage_bucket: bucket,
                         storage_path: storagePath,
                         // optional extras:
                         // original_name: singleFile.name,
                         // uploaded_by: uid,
                    });

               if (insertError) {
                    await logServerAction({
                         action: 'Upload Image - Failed DB insert',
                         duration_ms: 0,
                         error: insertError.message,
                         payload: { bucket, storagePath },
                         status: 'fail',
                         type: 'db',
                         user_id: uid,
                    });
                    return { success: false, error: insertError.message };
               }

               storagePaths.push(storagePath);
          }

          // Create signed URLs (batch) for immediate UI use
          const { data: signedArr, error: signErr } = await supabase.storage
               .from(bucket)
               .createSignedUrls(storagePaths, SIGNED_URL_TTL_SECONDS);

          if (signErr || !signedArr) {
               await logServerAction({
                    action: 'Upload Image - Failed to create signed URLs',
                    duration_ms: 0,
                    error: signErr?.message ?? 'No signed URLs returned',
                    payload: { bucket, storagePaths },
                    status: 'fail',
                    type: 'db',
                    user_id: uid,
               });
               return { success: false, error: 'Failed to create signed URLs' };
          }

          const urls = signedArr.map(x => x.signedUrl).filter(Boolean) as string[];

          await logServerAction({
               action: 'Upload Image - Success',
               duration_ms: 0,
               error: '',
               payload: { count: urls.length, bucket },
               status: 'success',
               type: 'db',
               user_id: uid,
          });

          revalidatePath(`/dashboard/buildings/${buildingId}`);
          return { success: true, urls };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
};

/**
 * Removes an image file from Supabase Storage and deletes the image record from `tblBuildingImages`
 */
export const removeBuildingImageFilePath = async (
     buildingId: string,
     filePathOrUrl: string
): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = DEFAULT_BUCKET;

     try {
          // Derive bucket+path from the input
          const ref = toStorageRef(filePathOrUrl) ?? { bucket, path: filePathOrUrl };
          const { bucket: bkt, path } = ref;

          // Delete file from Storage
          const { error: deleteError } = await supabase.storage.from(bkt).remove([path]);
          if (deleteError) {
               await logServerAction({
                    action: 'Delete Image - Failed to delete from Storage',
                    duration_ms: 0,
                    error: deleteError.message,
                    payload: { buildingId, filePathOrUrl, bucket: bkt, path },
                    status: 'fail',
                    type: 'db',
                    user_id: null,
               });
               return { success: false, error: deleteError.message };
          }

          // Delete DB row by new columns first
          const { error: dbDeleteNewErr } = await supabase
               .from('tblBuildingImages')
               .delete()
               .match({ building_id: buildingId, storage_bucket: bkt, storage_path: path });

          if (dbDeleteNewErr) {
               // Try legacy column as a fallback (old rows with image_url)
               const { error: dbDeleteLegacyErr } = await supabase
                    .from('tblBuildingImages')
                    .delete()
                    .match({ building_id: buildingId, storage_path: filePathOrUrl });

               if (dbDeleteLegacyErr) {
                    await logServerAction({
                         action: 'Delete Image - Failed to delete DB row',
                         duration_ms: 0,
                         error: dbDeleteLegacyErr.message,
                         payload: { buildingId, filePathOrUrl, bucket: bkt, path },
                         status: 'fail',
                         type: 'db',
                         user_id: null,
                    });
                    return { success: false, error: dbDeleteLegacyErr.message };
               }
          }

          revalidatePath(`/dashboard/buildings/${buildingId}`);
          return { success: true };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
};

/**
 * Removes all images from Supabase Storage and deletes the image records from `tblBuildingImages`
 */
export const removeAllImagesFromBuilding = async (
     buildingId: string
): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          // Pull both legacy and new columns
          const { data: images, error: imagesError } = await supabase
               .from('tblBuildingImages')
               .select('storage_path, storage_bucket, storage_path')
               .eq('building_id', buildingId);
          console.log('err', imagesError);

          if (imagesError) {
               await logServerAction({
                    action: 'Delete All Images - Failed to fetch rows',
                    duration_ms: 0,
                    error: imagesError.message,
                    payload: { buildingId },
                    status: 'fail',
                    type: 'db',
                    user_id: null,
               });
               return { success: false, error: imagesError.message };
          }

          if (!images?.length) {
               // Nothing to delete
               return { success: true };
          }

          // Build {bucket -> [paths]} map from new refs or fallback parse of legacy URLs
          const byBucket = new Map<string, string[]>();

          for (const row of images) {
               let bucket = row.storage_bucket ?? DEFAULT_BUCKET;
               let path = row.storage_path ?? '';

               if (!row.storage_path && row.storage_path) {
                    const ref = toStorageRef(row.storage_path);
                    if (ref) {
                         bucket = ref.bucket;
                         path = ref.path;
                    }
               }

               if (bucket && path) {
                    const arr = byBucket.get(bucket) ?? [];
                    arr.push(path);
                    byBucket.set(bucket, arr);
               }
          }

          // Delete files per bucket
          for (const [bucket, paths] of byBucket) {
               if (!paths.length) continue;
               const { error: delErr } = await supabase.storage.from(bucket).remove(paths);
               console.log('delErr', delErr);

               if (delErr) {
                    await logServerAction({
                         action: 'Delete All Images - Storage remove failed',
                         duration_ms: 0,
                         error: delErr.message,
                         payload: { buildingId, bucket, count: paths.length },
                         status: 'fail',
                         type: 'db',
                         user_id: null,
                    });
                    return { success: false, error: delErr.message };
               }
          }

          // Delete DB rows for this building (covers both legacy and new)
          const { error: dbDeleteError } = await supabase
               .from('tblBuildingImages')
               .delete()
               .eq('building_id', buildingId);
          console.log('dbDeleteError', dbDeleteError);

          if (dbDeleteError) {
               await logServerAction({
                    action: 'Delete All Images - DB rows delete failed',
                    duration_ms: 0,
                    error: dbDeleteError.message,
                    payload: { buildingId },
                    status: 'fail',
                    type: 'db',
                    user_id: null,
               });
               return { success: false, error: dbDeleteError.message };
          }

          await logServerAction({
               action: 'Delete All Images - Success',
               duration_ms: 0,
               error: '',
               payload: { buildingId, buckets: Array.from(byBucket.keys()), total: images.length },
               status: 'success',
               type: 'db',
               user_id: null,
          });

          revalidatePath(`/dashboard/buildings/${buildingId}`);
          return { success: true };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
};

/**
 * Sets the cover image for a specific building.
 *
 * @param buildingId - The unique identifier of the building.
 * @param imageURL - The URL of the image to be set as the cover.
 * @returns An object indicating success or failure, with an optional error message.
 *
 * This function updates the `cover_image` field in the `tblBuildings` table
 * with the provided image URL for the specified building. It also logs the
 * action and revalidates the associated path. If an error occurs during the 
 * update, it logs the error and returns an object with the error message.
 */

export const setAsBuildingCoverImage = async (
     buildingId: string,
     imageURL: string
): Promise<{ success: boolean; error?: string }> => {

     const supabase = await useServerSideSupabaseAnonClient();

     try {

          // Set new cover
          const { error: updateError } = await supabase
               .from('tblBuildings')
               .update({ cover_image: imageURL })
               .eq('id', buildingId)

          if (updateError) {
               await logServerAction({
                    action: 'setAsBuildingCoverImage',
                    duration_ms: 0,
                    error: updateError.message,
                    payload: { buildingId, imageURL },
                    status: 'fail',
                    type: 'db',
                    user_id: null,
               })
               return { success: false, error: updateError.message };
          }

          revalidatePath(`/dashboard/buildings/${buildingId}`);
          return { success: true };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
}

// ======================= UPLOAD =======================

/**
 * Uploads images to Storage and links them in tblApartmentImages.
 * Returns fresh signed URLs for immediate UI rendering.
 */
export const uploadApartmentImagesAndGetUrls = async (
     files: File[],
     client: string,      // kept for backward-compat; not used
     address: string,     // kept for backward-compat; not used
     apartmentid: string
): Promise<{ success: boolean; urls?: string[]; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;
     const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1h

     try {
          // must be signed-in; RLS checks the UID segment in the path
          const { data: userData, error: userErr } = await supabase.auth.getUser();
          if (userErr || !userData?.user) {
               await logServerAction({
                    action: 'Upload Apartment Images - Missing auth user',
                    duration_ms: 0,
                    error: userErr?.message ?? 'No user in session',
                    payload: { apartmentid },
                    status: 'fail',
                    type: 'auth',
                    user_id: null,
               });
               return { success: false, error: 'Not signed in' };
          }
          const uid = userData.user.id;

          const storagePaths: string[] = [];

          for (const singleFile of files) {
               const storagePath = [
                    'clients',
                    uid,                   // 👈 auth.uid() second segment (RLS)
                    'apartments',
                    apartmentid,
                    'images',
                    sanitizeSegmentForS3(singleFile.name),
               ].join('/');

               const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(storagePath, singleFile, {
                         cacheControl: '3600',
                         upsert: true,       // needs UPDATE policy (you have it)
                    });

               if (uploadError) {
                    await logServerAction({
                         action: 'Upload Apartment Image - Storage upload failed',
                         duration_ms: 0,
                         error: uploadError.message,
                         payload: { bucket, storagePath, apartmentid },
                         status: 'fail',
                         type: 'db',
                         user_id: uid,
                    });
                    return { success: false, error: `${uploadError.message} for file ${singleFile.name}` };
               }

               // store refs in DB (not a URL)
               const { error: insertError } = await supabase
                    .from('tblApartmentImages')
                    .insert({
                         apartment_id: apartmentid,
                         storage_bucket: bucket,
                         storage_path: storagePath,
                    });

               if (insertError) {
                    await logServerAction({
                         action: 'Upload Apartment Image - DB insert failed',
                         duration_ms: 0,
                         error: insertError.message,
                         payload: { bucket, storagePath, apartmentid },
                         status: 'fail',
                         type: 'db',
                         user_id: uid,
                    });
                    return { success: false, error: insertError.message };
               }

               storagePaths.push(storagePath);
          }

          // sign URLs in batch for the UI
          const { data: signedArr, error: signErr } = await supabase.storage
               .from(bucket)
               .createSignedUrls(storagePaths, SIGNED_URL_TTL_SECONDS);

          if (signErr || !signedArr) {
               await logServerAction({
                    action: 'Upload Apartment Images - signing failed',
                    duration_ms: 0,
                    error: signErr?.message ?? 'No signed URLs returned',
                    payload: { bucket, apartmentid, count: storagePaths.length },
                    status: 'fail',
                    type: 'db',
                    user_id: uid,
               });
               return { success: false, error: 'Failed to create signed URLs' };
          }

          const urls = signedArr.map(x => x.signedUrl).filter(Boolean) as string[];

          await logServerAction({
               action: 'Upload Apartment Images - Success',
               duration_ms: 0,
               error: '',
               payload: { apartmentid, count: urls.length },
               status: 'success',
               type: 'db',
               user_id: uid,
          });

          revalidatePath(`/dashboard/apartments/${apartmentid}`);
          return { success: true, urls };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
};

// =================== REMOVE SINGLE ====================

/**
 * Removes an image file from Storage and deletes the row from tblApartmentImages.
 * Accepts either a full Supabase URL (public or signed) or a plain storage path.
 */
export const removeApartmentImageFilePath = async (
     apartmentid: string,
     filePathOrUrl: string
): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;

     try {
          // derive { bucket, path } from URL or path
          const ref = toStorageRef(filePathOrUrl) ?? { bucket, path: filePathOrUrl };
          const bkt = ref.bucket ?? bucket;
          const path = ref.path;

          // delete from Storage
          const { error: deleteError } = await supabase.storage.from(bkt).remove([path]);
          if (deleteError) {
               await logServerAction({
                    action: 'Delete Apartment Image - Storage remove failed',
                    duration_ms: 0,
                    error: deleteError.message,
                    payload: { apartmentid, bucket: bkt, path },
                    status: 'fail',
                    type: 'db',
                    user_id: null,
               });
               return { success: false, error: deleteError.message };
          }

          // delete DB row (new columns); fallback to legacy image_url
          const { error: dbDeleteNewErr } = await supabase
               .from('tblApartmentImages')
               .delete()
               .match({ apartment_id: apartmentid, storage_bucket: bkt, storage_path: path });

          if (dbDeleteNewErr) {
               const { error: dbDeleteLegacyErr } = await supabase
                    .from('tblApartmentImages')
                    .delete()
                    .match({ apartment_id: apartmentid, image_url: filePathOrUrl });

               if (dbDeleteLegacyErr) {
                    await logServerAction({
                         action: 'Delete Apartment Image - DB delete failed',
                         duration_ms: 0,
                         error: dbDeleteLegacyErr.message,
                         payload: { apartmentid, bucket: bkt, path },
                         status: 'fail',
                         type: 'db',
                         user_id: null,
                    });
                    return { success: false, error: dbDeleteLegacyErr.message };
               }
          }

          revalidatePath(`/dashboard/apartments/${apartmentid}`);
          return { success: true };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
};

// ===================== REMOVE ALL =====================

/**
 * Deletes all images for an apartment from Storage and tblApartmentImages.
 */
export const removeAllImagesFromApartment = async (
     apartmentid: string
): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          // fetch both new & legacy fields
          const { data: images, error: imagesError } = await supabase
               .from('tblApartmentImages')
               .select('storage_bucket, storage_path, image_url')
               .eq('apartment_id', apartmentid);

          if (imagesError) {
               await logServerAction({
                    action: 'Delete All Apartment Images - fetch failed',
                    duration_ms: 0,
                    error: imagesError.message,
                    payload: { apartmentid },
                    status: 'fail',
                    type: 'db',
                    user_id: null,
               });
               return { success: false, error: imagesError.message };
          }

          if (!images?.length) return { success: true };

          // group paths by bucket
          const byBucket = new Map<string, string[]>();
          for (const row of images) {
               let bkt = row.storage_bucket ?? process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;
               let pth = row.storage_path;

               if (!pth && row.image_url) {
                    const ref = toStorageRef(row.image_url);
                    if (ref) { bkt = ref.bucket; pth = ref.path; }
               }
               if (!pth) continue;

               const arr = byBucket.get(bkt) ?? [];
               arr.push(pth);
               byBucket.set(bkt, arr);
          }

          // delete from Storage
          for (const [bkt, paths] of byBucket) {
               if (!paths.length) continue;
               const { error: delErr } = await supabase.storage.from(bkt).remove(paths);
               if (delErr) {
                    await logServerAction({
                         action: 'Delete All Apartment Images - Storage remove failed',
                         duration_ms: 0,
                         error: delErr.message,
                         payload: { apartmentid, bucket: bkt, count: paths.length },
                         status: 'fail',
                         type: 'db',
                         user_id: null,
                    });
                    return { success: false, error: delErr.message };
               }
          }

          // delete DB rows
          const { error: dbDeleteError } = await supabase
               .from('tblApartmentImages')
               .delete()
               .eq('apartment_id', apartmentid);

          if (dbDeleteError) {
               await logServerAction({
                    action: 'Delete All Apartment Images - DB delete failed',
                    duration_ms: 0,
                    error: dbDeleteError.message,
                    payload: { apartmentid },
                    status: 'fail',
                    type: 'db',
                    user_id: null,
               });
               return { success: false, error: dbDeleteError.message };
          }

          revalidatePath(`/dashboard/apartments/${apartmentid}`);
          return { success: true };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
};


/**
 * Sets the given URL as the cover image for the apartment with the given ID.
 * Returns a promise resolving to an object with a success boolean.
 * @param apartmentid The ID of the apartment to set the cover image for.
 * @param url The URL of the image to set as the cover image.
 * @returns A promise resolving to an object with a success boolean.
 */
export const setAsApartmentCoverImage = async (apartmentid: string, url: string): Promise<{ success: boolean }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const { error: dbError } = await supabase.from('tblApartments').update({ cover_image: url }).eq('id', apartmentid);
     if (dbError) return { success: false };
     revalidatePath(`/dashboard/apartments`);
     return { success: !dbError }
}

