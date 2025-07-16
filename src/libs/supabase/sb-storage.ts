'use server';

import { revalidatePath } from "next/cache";
import { useServerSideSupabaseAnonClient } from "./sb-server";
import { logServerAction } from "./server-logging";

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
     client: string,
     address: string,
     buildingId: string
): Promise<{ success: boolean; urls?: string[]; error?: string }> => {

     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = process.env.SUPABASE_S3_CLIENT_IMAGES_BUCKET!;
     const urls: string[] = [];

     try {
          for (const singleFile of files) {
               const encodedFilePath = [
                    'Clients',
                    sanitizeSegmentForS3(client),
                    sanitizeSegmentForS3(address),
                    sanitizeSegmentForS3(singleFile.name),
               ].join('/');

               const { data, error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(encodedFilePath, singleFile, {
                         cacheControl: '3600',
                         upsert: true,
                    });

               if (uploadError) {
                    await logServerAction({
                         action: 'Upload Image - Failed to upload to S3',
                         duration_ms: 0,
                         error: uploadError.message,
                         payload: { client, address, buildingId },
                         status: 'fail',
                         type: 'db',
                         user_id: '',
                    })
                    return {
                         success: false,
                         error: `${uploadError.message} for file ${singleFile.name}`,
                    };
               }

               const { data: publicUrlData } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(encodedFilePath);

               const imageUrl = publicUrlData?.publicUrl;
               await logServerAction({
                    action: 'Upload Image - Success',
                    duration_ms: 0,
                    error: '',
                    payload: { imageUrl },
                    status: 'success',
                    type: 'db',
                    user_id: '',
               })
               if (!imageUrl) {
                    await logServerAction({
                         action: 'Upload Image - Failed to get public URL',
                         duration_ms: 0,
                         error: 'Failed to retrieve public URL',
                         payload: { client, address, buildingId },
                         status: 'fail',
                         type: 'db',
                         user_id: '',
                    })
                    return { success: false, error: 'Failed to retrieve public URL' };
               }

               const { error: insertError } = await supabase
                    .from('tblBuildingImages')
                    .insert({
                         building_id: buildingId,
                         image_url: imageUrl,
                    });

               if (insertError) {
                    await logServerAction({
                         action: 'Upload Image - Failed to insert into tblBuildingImages',
                         duration_ms: 0,
                         error: insertError.message,
                         payload: { client, address, buildingId },
                         status: 'fail',
                         type: 'db',
                         user_id: '',
                    })
                    return { success: false, error: insertError.message };
               }
               await logServerAction({
                    action: 'Upload Image - Success',
                    duration_ms: 0,
                    error: '',
                    payload: { imageUrl },
                    status: 'success',
                    type: 'db',
                    user_id: '',
               })
               urls.push(imageUrl);
          }

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
     const bucket = process.env.SUPABASE_S3_CLIENT_IMAGES_BUCKET!;

     try {
          // Extract the file path relative to the bucket
          let filePath = filePathOrUrl;

          if (filePathOrUrl.startsWith('https://')) {
               const publicPrefix = `/storage/v1/object/public/${bucket}/`;
               const startIndex = filePathOrUrl.indexOf(publicPrefix);
               if (startIndex === -1) {
                    return { success: false, error: 'Invalid public URL format.' };
               }

               filePath = filePathOrUrl.substring(startIndex + publicPrefix.length);
          }

          // Delete from S3
          const { error: deleteError } = await supabase.storage.from(bucket).remove([filePath]);
          if (deleteError) {
               await logServerAction({
                    action: 'Delete Image - Failed to delete from S3',
                    duration_ms: 0,
                    error: deleteError.message,
                    payload: { buildingId, filePathOrUrl },
                    status: 'fail',
                    type: 'db',
                    user_id: '',
               })
               return { success: false, error: deleteError.message };
          }

          // Delete from tblBuildingImages
          const { error: dbDeleteError } = await supabase
               .from('tblBuildingImages')
               .delete({ count: 'exact' })
               .eq('building_id', buildingId)
               .eq('image_url', filePathOrUrl) // This is still full URL as stored in DB
               .select('*');

          if (dbDeleteError) {
               await logServerAction({
                    action: 'Delete Image - Failed to delete from tblBuildingImages',
                    duration_ms: 0,
                    error: dbDeleteError.message,
                    payload: { buildingId, filePathOrUrl },
                    status: 'fail',
                    type: 'db',
                    user_id: '',
               })
               return { success: false, error: dbDeleteError.message };
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
     const bucket = process.env.SUPABASE_S3_CLIENT_IMAGES_BUCKET!;

     try {
          const { data: images, error: imagesError } = await supabase
               .from('tblBuildingImages')
               .select('image_url')
               .eq('building_id', buildingId);

          if (imagesError) {
               await logServerAction({
                    action: 'Delete All Images - Failed to retrieve images from tblBuildingImages',
                    duration_ms: 0,
                    error: imagesError.message,
                    payload: { buildingId },
                    status: 'fail',
                    type: 'db',
                    user_id: '',
               })
               return { success: false, error: imagesError.message };
          }

          if (!images || images.length === 0) {
               return { success: true }; // Nothing to delete
          }

          // Extract relative file paths from full URLs
          const publicPrefix = `/storage/v1/object/public/${bucket}/`;
          const filePaths = images
               .map((img) => {
                    const url = img.image_url;
                    const idx = url.indexOf(publicPrefix);
                    return idx !== -1 ? url.substring(idx + publicPrefix.length) : null;
               })
               .filter((path): path is string => Boolean(path)); // filter out nulls

          // Delete files from S3
          if (filePaths.length > 0) {
               const { error: deleteError } = await supabase.storage.from(bucket).remove(filePaths);
               if (deleteError) {
                    return { success: false, error: deleteError.message };
               }
          }

          // Delete rows from DB
          const { data, error: dbDeleteError, count } = await supabase
               .from('tblBuildingImages')
               .delete({ count: 'exact' }) // optional but useful if you want to confirm
               .eq('building_id', buildingId);

          if (dbDeleteError) {
               await logServerAction({
                    action: 'Delete All Images - Failed to delete from tblBuildingImages',
                    duration_ms: 0,
                    error: dbDeleteError.message,
                    payload: { buildingId },
                    status: 'fail',
                    type: 'db',
                    user_id: '',
               })
               return { success: false, error: dbDeleteError.message };
          }

          await logServerAction({
               action: 'Delete All Images - Success',
               duration_ms: 0,
               error: '',
               payload: { buildingId },
               status: 'success',
               type: 'db',
               user_id: '',
          })
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
               .eq('building_id', buildingId)

          if (updateError) {
               await logServerAction({
                    action: 'setAsBuildingCoverImage',
                    duration_ms: 0,
                    error: updateError.message,
                    payload: { buildingId, imageURL },
                    status: 'fail',
                    type: 'db',
                    user_id: '',
               })
               return { success: false, error: updateError.message };
          }

          revalidatePath(`/dashboard/buildings/${buildingId}`);
          return { success: true };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
}


/**
 * Uploads one or more images to Supabase Storage and links them to an apartment in `tblApartmentImages`
 *
 * @param files - The images to be uploaded
 * @param client - The client that the apartment belongs to
 * @param address - The address of the apartment
 * @param apartmentid - The unique identifier of the apartment
 * @returns An object indicating success or failure, with an optional array of URLs and an optional error message
 */
export const uploadApartmentImagesAndGetUrls = async (
     files: File[],
     client: string,
     address: string,
     apartmentid: string
): Promise<{ success: boolean; urls?: string[]; error?: string }> => {

     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = process.env.SUPABASE_S3_CLIENT_IMAGES_BUCKET!;
     const urls: string[] = [];

     try {
          for (const singleFile of files) {
               const encodedFilePath = [
                    'Clients',
                    sanitizeSegmentForS3(client),
                    sanitizeSegmentForS3(address),
                    sanitizeSegmentForS3(singleFile.name),
               ].join('/');

               const { data, error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(encodedFilePath, singleFile, {
                         cacheControl: '3600',
                         upsert: true,
                    });

               if (uploadError) {
                    await logServerAction({
                         action: 'Upload Image - Failed to upload to S3',
                         duration_ms: 0,
                         error: uploadError.message,
                         payload: { client, address, apartmentid },
                         status: 'fail',
                         type: 'db',
                         user_id: '',
                    })
                    return {
                         success: false,
                         error: `${uploadError.message} for file ${singleFile.name}`,
                    };
               }

               const { data: publicUrlData } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(encodedFilePath);

               const imageUrl = publicUrlData?.publicUrl;
               await logServerAction({
                    action: 'Upload Image - Success',
                    duration_ms: 0,
                    error: '',
                    payload: { imageUrl },
                    status: 'success',
                    type: 'db',
                    user_id: '',
               })
               if (!imageUrl) {
                    await logServerAction({
                         action: 'Upload Image - Failed to get public URL',
                         duration_ms: 0,
                         error: 'Failed to retrieve public URL',
                         payload: { client, address, apartmentid },
                         status: 'fail',
                         type: 'db',
                         user_id: '',
                    })
                    return { success: false, error: 'Failed to retrieve public URL' };
               }

               const { error: insertError } = await supabase
                    .from('tblApartmentImages')
                    .insert({
                         apartment_id: apartmentid,
                         image_url: imageUrl,
                    });
               console.log('insertError', insertError);

               if (insertError) {
                    await logServerAction({
                         action: 'Upload Image - Failed to insert into tblApartmentImages',
                         duration_ms: 0,
                         error: insertError.message,
                         payload: { client, address, apartmentid },
                         status: 'fail',
                         type: 'db',
                         user_id: '',
                    })
                    return { success: false, error: insertError.message };
               }
               await logServerAction({
                    action: 'Upload Image - Success',
                    duration_ms: 0,
                    error: '',
                    payload: { imageUrl },
                    status: 'success',
                    type: 'db',
                    user_id: '',
               })
               urls.push(imageUrl);
          }

          revalidatePath(`/dashboard/apartments/${apartmentid}`);
          return { success: true, urls };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
};

/**
 * Removes an image file from Supabase Storage and deletes the image record from `tblApartmentImages`
 */
export const removeApartmentImageFilePath = async (
     apartmentid: string,
     filePathOrUrl: string
): Promise<{ success: boolean; error?: string }> => {

     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = process.env.SUPABASE_S3_CLIENT_IMAGES_BUCKET!;

     try {
          // Extract the file path relative to the bucket
          let filePath = filePathOrUrl;

          if (filePathOrUrl.startsWith('https://')) {
               const publicPrefix = `/storage/v1/object/public/${bucket}/`;
               const startIndex = filePathOrUrl.indexOf(publicPrefix);
               if (startIndex === -1) {
                    return { success: false, error: 'Invalid public URL format.' };
               }

               filePath = filePathOrUrl.substring(startIndex + publicPrefix.length);
          }

          // Delete from S3
          const { error: deleteError } = await supabase.storage.from(bucket).remove([filePath]);
          if (deleteError) {
               await logServerAction({
                    action: 'Delete Image - Failed to delete from S3',
                    duration_ms: 0,
                    error: deleteError.message,
                    payload: { apartmentid, filePathOrUrl },
                    status: 'fail',
                    type: 'db',
                    user_id: '',
               })
               return { success: false, error: deleteError.message };
          }

          // Delete from tblApartmentImages
          const { error: dbDeleteError } = await supabase
               .from('tblApartmentImages')
               .delete({ count: 'exact' })
               .eq('apartment_id', apartmentid)
               .eq('image_url', filePathOrUrl) // This is still full URL as stored in DB
               .select('*');

          if (dbDeleteError) {
               await logServerAction({
                    action: 'Delete Image - Failed to delete from tblApartmentImages',
                    duration_ms: 0,
                    error: dbDeleteError.message,
                    payload: { apartmentid, filePathOrUrl },
                    status: 'fail',
                    type: 'db',
                    user_id: '',
               })
               return { success: false, error: dbDeleteError.message };
          }
          revalidatePath(`/dashboard/apartments/${apartmentid}`);
          return { success: true };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
};

/**
 * Deletes all images associated with a given apartment ID from Supabase Storage and tblApartmentImages.
 * 
 * @param apartmentid The ID of the apartment to delete images for.
 * @returns A promise resolving to an object with a success boolean and optionally an error string.
 */
export const removeAllImagesFromApartment = async (apartmentid: string): Promise<{ success: boolean; error?: string }> => {

     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = process.env.SUPABASE_S3_CLIENT_IMAGES_BUCKET!;

     try {
          // 1. Get all images for the apartment
          const { data: images, error: imagesError } = await supabase
               .from('tblApartmentImages')
               .select('image_url')
               .eq('apartment_id', apartmentid);

          if (imagesError) {
               await logServerAction({
                    action: 'Delete All Images - Failed to retrieve images from tblApartmentImages',
                    duration_ms: 0,
                    error: imagesError.message,
                    payload: { apartmentid },
                    status: 'fail',
                    type: 'db',
                    user_id: '',
               })
               return { success: false, error: imagesError.message };
          }

          if (!images || images.length === 0) {
               return { success: true }; // Nothing to delete
          }

          // 2. Delete all images from S3
          const filePaths = images
               .map((img) => {
                    const url = img.image_url;
                    const idx = url.indexOf(`/storage/v1/object/public/${bucket}/`);
                    return idx !== -1 ? url.substring(idx + `/storage/v1/object/public/${bucket}/`.length) : null;
               })
               .filter((path): path is string => Boolean(path)); // filter out nulls

          if (filePaths.length > 0) {
               const { error: deleteError } = await supabase.storage.from(bucket).remove(filePaths);
               if (deleteError) {
                    return { success: false, error: deleteError.message };
               }
          }

          // 3. Delete all images from tblApartmentImages
          const { error: dbDeleteError } = await supabase
               .from('tblApartmentImages')
               .delete({ count: 'exact' })
               .eq('apartment_id', apartmentid)
               .select('*');

          if (dbDeleteError) {
               await logServerAction({
                    action: 'Delete All Images - Failed to delete from tblApartmentImages',
                    duration_ms: 0,
                    error: dbDeleteError.message,
                    payload: { apartmentid },
                    status: 'fail',
                    type: 'db',
                    user_id: '',
               })
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
     revalidatePath(`/dashboard/apartments/`);
     return { success: !dbError }
}