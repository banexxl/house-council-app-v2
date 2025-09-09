"use server";

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';

// Prefer a dedicated documents bucket if provided, else fall back to images bucket
const getBucket = () => process.env.SUPABASE_S3_CLIENT_DOCS_BUCKET || process.env.SUPABASE_S3_CLIENT_IMAGES_BUCKET!;

const ANNOUNCEMENT_DOCUMENTS_TABLE = 'tblAnnouncementDocuments';

const sanitizeSegmentForS3 = (segment: string): string => {
     return segment
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9-_.]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '');
};

export interface AnnouncementDocumentRecord {
     id?: string;
     announcement_id: string;
     document_url: string;
     file_name: string;
     mime_type?: string;
     created_at?: string;
}

/**
 * Upload documents for an announcement. Stores metadata in tblAnnouncementDocuments.
 * Path: Announcements/<announcementId>/docs/<filename>
 */
// Allowed document extensions & mime types (ext mapped for quick validation)
const ALLOWED_DOC_EXTENSIONS: Record<string, string> = {
     'pdf': 'application/pdf',
     'doc': 'application/msword',
     'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'xls': 'application/vnd.ms-excel',
     'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
     'csv': 'text/csv',
     'txt': 'text/plain',
     'ppt': 'application/vnd.ms-powerpoint',
     'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
     'odt': 'application/vnd.oasis.opendocument.text',
     'ods': 'application/vnd.oasis.opendocument.spreadsheet',
     'zip': 'application/zip'
};

const MAX_DOC_SIZE_BYTES = 15 * 1024 * 1024; // 15MB safeguard

export async function uploadAnnouncementDocuments(files: File[], announcementId: string): Promise<{ success: boolean; urls?: { url: string; name: string; mime: string }[]; error?: string }> {
     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = getBucket();
     const urls: { url: string; name: string; mime: string }[] = [];
     try {
          for (const file of files) {
               const originalName = file.name;
               const extMatch = originalName.toLowerCase().match(/\.([a-z0-9]+)$/);
               const ext = extMatch ? extMatch[1] : '';

               if (!ext || !ALLOWED_DOC_EXTENSIONS[ext]) {
                    return { success: false, error: `File type not allowed: ${originalName}` };
               }

               if ((file as any).size && (file as any).size > MAX_DOC_SIZE_BYTES) {
                    return { success: false, error: `File too large (>${(MAX_DOC_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB): ${originalName}` };
               }

               const mimeFromExt = ALLOWED_DOC_EXTENSIONS[ext];
               // Some browsers may give a generic or empty type for certain office docs; fallback to ext mapping
               const finalMime = (file as any).type && (file as any).type !== '' ? (file as any).type : mimeFromExt;

               const encodedFilePath = [
                    'Announcements',
                    sanitizeSegmentForS3(announcementId),
                    'docs',
                    // Ensure we keep extension (sanitize base then append extension)
                    (() => {
                         const base = sanitizeSegmentForS3(originalName.replace(/\.[^.]+$/, '')) || 'file';
                         return `${base}.${ext}`;
                    })()
               ].join('/');

               // Some storage backends may reject certain Office Open XML MIME types; provide safe fallback logic.
               const SAFE_CONTENT_TYPES = new Set([
                    'application/pdf',
                    'application/msword',
                    'application/vnd.ms-excel',
                    'text/csv',
                    'text/plain',
                    'application/vnd.ms-powerpoint',
                    'application/zip',
                    'application/octet-stream'
               ]);

               // If mime not in safe list but is an OOXML variant, try original first then fallback.
               const isOOXML = /vnd\.openxmlformats-officedocument/.test(finalMime);
               let uploadErrorFinal: any = null;
               if (isOOXML && !SAFE_CONTENT_TYPES.has(finalMime)) {
                    // Attempt with provided OOXML mime first
                    const { error: firstErr } = await supabase.storage.from(bucket).upload(encodedFilePath, file, { cacheControl: '3600', upsert: true, contentType: finalMime });
                    if (firstErr) {
                         // Retry with application/octet-stream
                         const { error: secondErr } = await supabase.storage.from(bucket).upload(encodedFilePath, file, { cacheControl: '3600', upsert: true, contentType: 'application/octet-stream' });
                         uploadErrorFinal = secondErr;
                    }
               } else {
                    const chosenContentType = SAFE_CONTENT_TYPES.has(finalMime) ? finalMime : 'application/octet-stream';
                    const { error: genericErr } = await supabase.storage.from(bucket).upload(encodedFilePath, file, { cacheControl: '3600', upsert: true, contentType: chosenContentType });
                    uploadErrorFinal = genericErr;
               }

               if (uploadErrorFinal) {
                    await logServerAction({ action: 'uploadAnnouncementDocuments', duration_ms: 0, error: uploadErrorFinal.message, payload: { announcementId, file: originalName }, status: 'fail', type: 'db', user_id: null });
                    return { success: false, error: uploadErrorFinal.message };
               }

               const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(encodedFilePath);
               const publicUrl = publicUrlData?.publicUrl;
               if (!publicUrl) return { success: false, error: 'Failed to resolve public URL' };

               const { error: insertError } = await supabase.from(ANNOUNCEMENT_DOCUMENTS_TABLE).insert({
                    announcement_id: announcementId,
                    document_url: publicUrl,
                    file_name: originalName,
                    mime_type: finalMime
               });

               if (insertError) {
                    await logServerAction({ action: 'insertAnnouncementDocument', duration_ms: 0, error: insertError.message, payload: { announcementId }, status: 'fail', type: 'db', user_id: null });
                    return { success: false, error: insertError.message };
               }
               urls.push({ url: publicUrl, name: originalName, mime: finalMime });
          }
          revalidatePath('/dashboard/announcements');
          await logServerAction({ action: 'uploadAnnouncementDocuments', duration_ms: 0, error: '', payload: { announcementId, count: urls.length }, status: 'success', type: 'db', user_id: null });
          return { success: true, urls };
     } catch (e: any) {
          return { success: false, error: e.message };
     }
}

export async function getAnnouncementDocuments(announcementId: string): Promise<{ success: boolean; data?: AnnouncementDocumentRecord[]; error?: string }> {
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.from(ANNOUNCEMENT_DOCUMENTS_TABLE).select('id,document_url,file_name,mime_type').eq('announcement_id', announcementId);
     console.log('getAnnouncementDocuments', { announcementId, data, error });

     if (error) return { success: false, error: error.message };
     return { success: true, data: data as AnnouncementDocumentRecord[] };
}

export async function removeAnnouncementDocument(announcementId: string, filePathOrUrl: string): Promise<{ success: boolean; error?: string }> {
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
          const { error: dbDelErr } = await supabase.from(ANNOUNCEMENT_DOCUMENTS_TABLE).delete({ count: 'exact' }).eq('announcement_id', announcementId).eq('document_url', filePathOrUrl);
          if (dbDelErr) return { success: false, error: dbDelErr.message };
          revalidatePath('/dashboard/announcements');
          return { success: true };
     } catch (e: any) {
          return { success: false, error: e.message };
     }
}

export async function removeAllAnnouncementDocuments(announcementId: string): Promise<{ success: boolean; error?: string }> {
     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = getBucket();
     try {
          const { data: docs, error: docsErr } = await supabase.from(ANNOUNCEMENT_DOCUMENTS_TABLE).select('document_url').eq('announcement_id', announcementId);
          if (docsErr) return { success: false, error: docsErr.message };
          if (!docs || docs.length === 0) return { success: true };
          const publicPrefix = `/storage/v1/object/public/${bucket}/`;
          const paths = docs.map(d => {
               const idx = d.document_url.indexOf(publicPrefix);
               return idx !== -1 ? d.document_url.substring(idx + publicPrefix.length) : null;
          }).filter(Boolean) as string[];
          if (paths.length) {
               const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
               if (removeError) return { success: false, error: removeError.message };
          }
          const { error: dbDeleteError } = await supabase.from(ANNOUNCEMENT_DOCUMENTS_TABLE).delete({ count: 'exact' }).eq('announcement_id', announcementId);
          if (dbDeleteError) return { success: false, error: dbDeleteError.message };
          revalidatePath('/dashboard/announcements');
          return { success: true };
     } catch (e: any) {
          return { success: false, error: e.message };
     }
}
