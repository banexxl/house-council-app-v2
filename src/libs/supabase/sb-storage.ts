'use server'

import { useServerSideSupabaseServiceRoleClient } from "./sb-server";

const sanitizeSegmentForS3 = (segment: string): string => {
     return segment
          .normalize('NFD')                         // separate diacritics (e.g., ć → c +  ́)
          .replace(/[\u0300-\u036f]/g, '')          // remove diacritics
          .replace(/[^a-zA-Z0-9-_\.]/g, '_')        // replace non-safe characters with _
          .replace(/_+/g, '_')                      // collapse multiple underscores
          .replace(/^_+|_+$/g, '');                 // trim leading/trailing underscores
}

export const uploadImageAndGetUrl = async (
     file: File[],
     client: string,
     address: string
): Promise<{ success: boolean; urls?: string[]; error?: string }> => {

     const supabase = await useServerSideSupabaseServiceRoleClient();
     const bucket = process.env.SUPABASE_S3_CLIENT_IMAGES_BUCKET!

     try {
          const urls: string[] = [];

          for (const singleFile of file) {
               const filePath = `Clients/${client}/${address}/${singleFile.name}`;

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
               console.log(uploadError);

               if (uploadError) {
                    return {
                         success: false,
                         error: `${uploadError.message} for file ${singleFile.name}`,
                    };
               }

               const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(encodedFilePath);

               if (publicUrlData) {
                    urls.push(publicUrlData.publicUrl);
               }
          }
          return {
               success: true,
               urls: urls,
          };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
}

export const removeFilePath = async (buildingId: string, filePath: string): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseServiceRoleClient();
     const bucket = process.env.SUPABASE_S3_CLIENT_IMAGES_BUCKET!
     try {
          const { error } = await supabase.storage.from(bucket).remove([filePath]);
          console.log(error);

          if (error) {
               return { success: false, error: error.message };
          }
          const { data, error: error2 } = await supabase
               .from('tblBuildings')
               .update({
                    cover_images: supabase.rpc('array_remove', {
                         input: 'cover_images',
                         element: filePath,
                    }),
               })
               .eq('id', buildingId);

          if (error2) {
               return { success: false, error: error2.message };
          }
          return { success: true };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
}