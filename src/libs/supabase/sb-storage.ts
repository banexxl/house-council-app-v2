'use server'

import { revalidatePath } from "next/cache";
import { useServerSideSupabaseServiceRoleClient } from "./sb-server";

const sanitizeSegmentForS3 = (segment: string): string => {
     return segment
          .normalize('NFD')                         // separate diacritics (e.g., ć → c +  ́)
          .replace(/[\u0300-\u036f]/g, '')          // remove diacritics
          .replace(/[^a-zA-Z0-9-_\.]/g, '_')        // replace non-safe characters with _
          .replace(/_+/g, '_')                      // collapse multiple underscores
          .replace(/^_+|_+$/g, '');                 // trim leading/trailing underscores
}

export const uploadImagesAndGetUrl = async (
     file: File[],
     client: string,
     address: string,
     buildingId: string
): Promise<{ success: boolean; urls?: string[]; error?: string }> => {
     const supabase = await useServerSideSupabaseServiceRoleClient();
     const bucket = process.env.SUPABASE_S3_CLIENT_IMAGES_BUCKET!;
     const urls: string[] = [];
     try {
          // Upload files and collect their public URLs
          for (const singleFile of file) {
               const encodedFilePath = [
                    'Clients',
                    sanitizeSegmentForS3(client),
                    sanitizeSegmentForS3(address),
                    sanitizeSegmentForS3(singleFile.name),
               ].join('/');

               const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(encodedFilePath, singleFile, {
                         cacheControl: '3600',
                         upsert: true,
                    });

               if (uploadError) {
                    return {
                         success: false,
                         error: `${uploadError.message} for file ${singleFile.name}`,
                    };
               }

               const { data: publicUrlData } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(encodedFilePath);

               if (publicUrlData?.publicUrl) {
                    urls.push(publicUrlData.publicUrl);
               }
          }
          console.log('urls', urls);

          // Fetch existing cover_images
          const { data: building, error: fetchError } = await supabase
               .from('tblBuildings')
               .select('cover_images')
               .eq('id', buildingId)
               .single();

          if (fetchError) {
               return { success: false, error: fetchError.message };
          }

          const existingUrls = building.cover_images || [];
          const newUrls = Array.from(new Set([...existingUrls, ...urls]));

          const { data: updatedRows, error: updateError } = await supabase
               .from('tblBuildings')
               .update({ cover_images: newUrls })
               .eq('id', buildingId)
               .select();

          console.log('updatedRows', updatedRows);

          if (updateError) {
               return { success: false, error: updateError.message };
          }

          revalidatePath(`/dashboard/buildings/${buildingId}`);

          return {
               success: true,
               urls,
          };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
};

export const removeBuildingImageFilePath = async (buildingId: string, filePath: string): Promise<{ success: boolean; error?: string }> => {

     const supabase = await useServerSideSupabaseServiceRoleClient();
     const bucket = process.env.SUPABASE_S3_CLIENT_IMAGES_BUCKET!

     try {
          const { error } = await supabase.storage.from(bucket).remove([filePath]);

          if (error) {
               return { success: false, error: error.message };
          }
          const { data: building } = await supabase
               .from('tblBuildings')
               .select('cover_images')
               .eq('id', buildingId)
               .single();

          if (!building) {
               return { success: false, error: 'Building not found' };
          }

          const updatedImages = (building.cover_images || []).filter((url: string) => url !== filePath);

          const { error: updateError } = await supabase
               .from('tblBuildings')
               .update({ cover_images: updatedImages })
               .eq('id', buildingId);

          if (updateError) {
               return { success: false, error: updateError.message };
          }

          revalidatePath(`/dashboard/buildings/${buildingId}`);
          return { success: true };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
}