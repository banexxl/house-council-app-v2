"use server";

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';

const ANNOUNCEMENT_IMAGES_TABLE = 'tblAnnouncementImages';

// Re-use same bucket env var as other image features
const getBucket = () => process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;

const sanitizeSegmentForS3 = (segment: string): string => {
     return segment
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9-_.]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '');
};

export interface AnnouncementImageRecord {
     id?: string;
     announcement_id: string;
     image_url: string;
     created_at?: string;
}

/**
 * Upload images for an announcement. Returns public URLs inserted into tblAnnouncementImages.
 * Preferred path: clients/<client_name>/images/announcements/<filename>
 * Fallback path (if clientName not provided): Announcements/<announcementId>/<filename>
 */
export async function uploadAnnouncementImages(files: File[], announcementId: string, client_name: string, announcement_title?: string): Promise<{ success: boolean; urls?: string[]; error?: string }> {
     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = getBucket();
     const urls: string[] = [];
     try {
          for (const file of files) {
               const encodedFilePath = [
                    'clients',
                    client_name,
                    'announcements',
                    sanitizeSegmentForS3(announcement_title || 'untitled'),
                    'images',
                    sanitizeSegmentForS3(file.name)
               ].join('/')

               const { error: uploadError } = await supabase.storage.from(bucket).upload(encodedFilePath, file, { cacheControl: '3600', upsert: true });
               if (uploadError) {
                    await logServerAction({ action: 'uploadAnnouncementImages', duration_ms: 0, error: uploadError.message, payload: { announcementId }, status: 'fail', type: 'db', user_id: null });
                    return { success: false, error: uploadError.message };
               }

               const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(encodedFilePath);
               const imageUrl = publicUrlData?.publicUrl;
               if (!imageUrl) {
                    return { success: false, error: 'Failed to resolve public URL' };
               }
               const { error: insertError } = await supabase.from(ANNOUNCEMENT_IMAGES_TABLE).insert({ announcement_id: announcementId, image_url: imageUrl });
               if (insertError) {
                    await logServerAction({ action: 'insertAnnouncementImage', duration_ms: 0, error: insertError.message, payload: { announcementId }, status: 'fail', type: 'db', user_id: null });
                    return { success: false, error: insertError.message };
               }
               urls.push(imageUrl);
          }
          revalidatePath('/dashboard/announcements');
          await logServerAction({ action: 'uploadAnnouncementImages', duration_ms: 0, error: '', payload: { announcementId, count: urls.length }, status: 'success', type: 'db', user_id: null });
          return { success: true, urls };
     } catch (e: any) {
          return { success: false, error: e.message };
     }
}

export async function removeAnnouncementImage(announcementId: string, filePathOrUrl: string): Promise<{ success: boolean; error?: string }> {
     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = getBucket();
     try {
          let filePath = filePathOrUrl;
          if (filePathOrUrl.startsWith('https://')) {
               const publicPrefix = `/storage/v1/object/public/${bucket}/`;
               const idx = filePathOrUrl.indexOf(publicPrefix);
               if (idx === -1) return { success: false, error: 'Invalid public URL' };
               filePath = filePathOrUrl.substring(idx + publicPrefix.length);
          }
          const { error: deleteError } = await supabase.storage.from(bucket).remove([filePath]);
          if (deleteError) return { success: false, error: deleteError.message };
          const { error: dbDeleteError } = await supabase.from(ANNOUNCEMENT_IMAGES_TABLE)
               .delete({ count: 'exact' })
               .eq('announcement_id', announcementId)
               .eq('image_url', filePathOrUrl)
               .select('*');
          if (dbDeleteError) return { success: false, error: dbDeleteError.message };
          revalidatePath('/dashboard/announcements');
          return { success: true };
     } catch (e: any) {
          return { success: false, error: e.message };
     }
}

export async function removeAllAnnouncementImages(announcementId: string): Promise<{ success: boolean; error?: string }> {
     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = getBucket();
     try {
          const { data: images, error: imagesError } = await supabase.from(ANNOUNCEMENT_IMAGES_TABLE).select('image_url').eq('announcement_id', announcementId);
          if (imagesError) return { success: false, error: imagesError.message };
          if (!images || images.length === 0) return { success: true };
          const publicPrefix = `/storage/v1/object/public/${bucket}/`;
          const paths = images.map(i => {
               const idx = i.image_url.indexOf(publicPrefix);
               return idx !== -1 ? i.image_url.substring(idx + publicPrefix.length) : null;
          }).filter(Boolean) as string[];
          if (paths.length) {
               const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
               if (removeError) return { success: false, error: removeError.message };
          }
          const { error: dbDeleteError } = await supabase.from(ANNOUNCEMENT_IMAGES_TABLE).delete({ count: 'exact' }).eq('announcement_id', announcementId);
          if (dbDeleteError) return { success: false, error: dbDeleteError.message };
          revalidatePath('/dashboard/announcements');
          return { success: true };
     } catch (e: any) {
          return { success: false, error: e.message };
     }
}

// Helper to fetch image URLs for an announcement
export async function getAnnouncementImages(announcementId: string): Promise<{ success: boolean; data?: string[]; error?: string }> {
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.from(ANNOUNCEMENT_IMAGES_TABLE).select('image_url').eq('announcement_id', announcementId);
     if (error) return { success: false, error: error.message };
     return { success: true, data: data?.map(r => r.image_url) || [] };
}
