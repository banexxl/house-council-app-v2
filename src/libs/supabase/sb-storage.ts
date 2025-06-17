'use server';

import { revalidatePath } from "next/cache";
import { useServerSideSupabaseServiceRoleClient } from "./sb-server";
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
export const uploadImagesAndGetUrls = async (
     files: File[],
     client: string,
     address: string,
     buildingId: string
): Promise<{ success: boolean; urls?: string[]; error?: string }> => {
     const supabase = await useServerSideSupabaseServiceRoleClient();
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

     const supabase = await useServerSideSupabaseServiceRoleClient();
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

     const supabase = await useServerSideSupabaseServiceRoleClient();
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

export const setAsBuildingCoverImage = async (
     buildingId: string,
     imageURL: string
): Promise<{ success: boolean; error?: string }> => {
     console.log(buildingId, imageURL);

     const supabase = await useServerSideSupabaseServiceRoleClient();

     try {

          //Clear existing cover
          const { error: clearError } = await supabase
               .from('tblBuildingImages')
               .update({ is_cover_image: false })
               .eq('building_id', buildingId)

          // Set new cover
          const { error: updateError } = await supabase
               .from('tblBuildingImages')
               .update({ is_cover_image: true })
               .eq('building_id', buildingId)
               .eq('image_url', imageURL)

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
