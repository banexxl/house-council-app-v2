'use server';

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from './sb-server';
import { logServerAction } from './server-logging';
import { toStorageRef } from 'src/utils/sb-bucket';
import { TABLES } from 'src/libs/supabase/tables';
import log from 'src/utils/logger';

const DEFAULT_BUCKET = process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const DEFAULT_CACHE_CONTROL = '3600';

const sanitizeSegmentForS3 = (segment: string): string => {
     return segment
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9-_.]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '');
};

type StorageEntity =
     | 'client-image'
     | 'building-image'
     | 'apartment-image'
     | 'announcement-image'
     | 'announcement-document'
     | 'poll-attachment'
     | 'post-image'
     | 'post-document'
     | 'incident-image';

interface PathContext {
     entityId: string;
     clientId?: string;
     userId?: string;
     file: File;
     index: number;
     meta?: Record<string, unknown>;
}

interface FileValidationResult {
     ok: boolean;
     error?: string;
     meta?: Record<string, unknown>;
}

interface DbConfig {
     table: string;
     foreignKeyColumn: string;
     mode: 'insert' | 'upsert';
     conflictTarget?: string[];
     ignoreDuplicates?: boolean;
     extraColumns?: (ctx: PathContext) => Record<string, unknown>;
}

interface StorageEntityConfig {
     bucket: string;
     requiresAuth?: boolean;
     getPathSegments: (ctx: PathContext) => string[];
     db?: DbConfig;
     revalidate?: (entityId: string) => string[];
     supportsCover?: {
          column: string;
          match: (entityId: string) => Record<string, unknown>;
     };
     validateFile?: (ctx: PathContext) => FileValidationResult;
     getUploadOptions?: (ctx: PathContext) => {
          cacheControl?: string;
          upsert?: boolean;
          contentType?: string;
     };
     returnSignedUrls?: boolean;
}

export interface UploadEntityFilesParams {
     entity: StorageEntity;
     entityId: string;
     files: File[];
     clientId?: string;
     buildingId?: string;
     apartmentId?: string | null;
     profileId?: string | null;
}

export interface UploadEntityFilesResult {
     success: boolean;
     records?: Record<string, unknown>[];
     signedUrls?: string[];
     error?: string;
}

export interface RemoveEntityFileParams {
     entity: StorageEntity;
     entityId: string;
     storagePathOrUrl: string;
}

export interface RemoveAllEntityFilesParams {
     entity: StorageEntity;
     entityId: string;
}

export interface SetEntityFileAsCoverParams {
     entity: StorageEntity;
     entityId: string;
     fileId: string;
}

interface BasicResult {
     success: boolean;
     error?: string;
}

const ANNOUNCEMENT_DOCUMENT_EXTENSIONS: Record<string, string> = {
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

const SAFE_CONTENT_TYPES = new Set<string>([
     'application/pdf',
     'application/msword',
     'application/vnd.ms-excel',
     'text/csv',
     'text/plain',
     'application/vnd.ms-powerpoint',
     'application/zip',
     'application/octet-stream',
]);

const MAX_ANNOUNCEMENT_DOC_SIZE_BYTES = 15 * 1024 * 1024;

const ensureValue = (value: string | undefined, message: string): string => {
     if (!value) {
          throw new Error(message);
     }
     return value;
};

const validateAnnouncementDocumentFile = (ctx: PathContext): FileValidationResult => {
     const name = ctx.file.name || 'file';
     const size = (ctx.file as unknown as { size?: number }).size ?? 0;
     const ext = (name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]) || '';

     if (!ext || !ANNOUNCEMENT_DOCUMENT_EXTENSIONS[ext]) {
          return { ok: false, error: `File type not allowed: ${name}` };
     }

     if (size > MAX_ANNOUNCEMENT_DOC_SIZE_BYTES) {
          const limitMb = Math.floor(MAX_ANNOUNCEMENT_DOC_SIZE_BYTES / (1024 * 1024));
          return { ok: false, error: `File too large (> ${limitMb}MB): ${name}` };
     }

     const mimeFromExt = ANNOUNCEMENT_DOCUMENT_EXTENSIONS[ext];
     const fileType = ((ctx.file as any)?.type as string | undefined) || '';
     const finalMime = fileType.trim() ? fileType : mimeFromExt;

     return {
          ok: true,
          meta: {
               fileName: name,
               mimeType: finalMime,
          },
     };
};

const determineAnnouncementDocumentContentType = (mimeType: string): string => {
     return SAFE_CONTENT_TYPES.has(mimeType) ? mimeType : 'application/octet-stream';
};

const defaultUploadOptions = (ctx: PathContext) => ({
     cacheControl: DEFAULT_CACHE_CONTROL,
     upsert: true,
     contentType: ((ctx.file as any)?.type as string | undefined) || undefined,
});

const requireAuthUserId = async (
     supabase: Awaited<ReturnType<typeof useServerSideSupabaseAnonClient>>,
     action: string,
     payload: Record<string, unknown>,
): Promise<{ ok: boolean; userId?: string; error?: string }> => {
     const { data: userData, error } = await supabase.auth.getUser();
     if (error || !userData?.user) {
          await logServerAction({
               action,
               duration_ms: 0,
               error: error?.message ?? 'No user in session',
               payload,
               status: 'fail',
               type: 'auth',
               user_id: null,
          });
          return { ok: false, error: 'Not signed in' };
     }

     return { ok: true, userId: userData.user.id };
};

const ENTITY_CONFIG: Record<StorageEntity, StorageEntityConfig> = {
     'client-image': {
          bucket: DEFAULT_BUCKET,
          requiresAuth: true,
          getPathSegments: ({ userId }) => {
               return ['clients', ensureValue(userId, 'userId is required'), 'images', 'logos'];
          },
          returnSignedUrls: true,
          revalidate: (entityId) => [`/dashboard/clients/${entityId}`, `/dashboard/clients`],
     },
     'building-image': {
          bucket: DEFAULT_BUCKET,
          requiresAuth: true,
          getPathSegments: ({ userId, entityId }) => {
               return ['clients', ensureValue(userId, 'userId is required'), 'buildings', ensureValue(entityId, 'entityId is required'), 'images'];
          },
          db: {
               table: TABLES.BUILDING_IMAGES ?? 'tblBuildingImages',
               foreignKeyColumn: 'building_id',
               mode: 'insert',
               extraColumns: () => ({ is_cover_image: false }),
          },
          revalidate: (entityId) => [`/dashboard/buildings/${entityId}`, `/dashboard/buildings`],
          supportsCover: {
               column: 'is_cover_image',
               match: (entityId) => ({ building_id: entityId }),
          },
     },
     'apartment-image': {
          bucket: DEFAULT_BUCKET,
          requiresAuth: true,
          getPathSegments: ({ userId, entityId }) => {
               return ['clients', ensureValue(userId, 'userId is required'), 'apartments', ensureValue(entityId, 'entityId is required'), 'images'];
          },
          db: {
               table: TABLES.APARTMENT_IMAGES ?? 'tblApartmentImages',
               foreignKeyColumn: 'apartment_id',
               mode: 'insert',
               extraColumns: () => ({ is_cover_image: false }),
          },
          revalidate: (entityId) => [`/dashboard/apartments/${entityId}`, `/dashboard/apartments`],
          supportsCover: {
               column: 'is_cover_image',
               match: (entityId) => ({ apartment_id: entityId }),
          },
     },
     'announcement-image': {
          bucket: DEFAULT_BUCKET,
          requiresAuth: true,
          getPathSegments: ({ userId, entityId }) => {
               return ['clients', ensureValue(userId, 'userId is required'), 'announcements', ensureValue(entityId, 'entityId is required'), 'images'];
          },
          db: {
               table: TABLES.ANNOUNCEMENT_IMAGES ?? 'tblAnnouncementImages',
               foreignKeyColumn: 'announcement_id',
               mode: 'upsert',
               conflictTarget: ['announcement_id', 'storage_bucket', 'storage_path'],
               ignoreDuplicates: true,
          },
          revalidate: () => ['/dashboard/announcements', '/dashboard/announcements/tenant'],
          returnSignedUrls: true,
     },
     'announcement-document': {
          bucket: DEFAULT_BUCKET,
          requiresAuth: true,
          getPathSegments: ({ userId, entityId }) => {
               return ['clients', ensureValue(userId, 'userId is required'), 'announcements', ensureValue(entityId, 'entityId is required'), 'docs'];
          },
          validateFile: validateAnnouncementDocumentFile,
          db: {
               table: TABLES.ANNOUNCEMENT_DOCUMENTS ?? 'tblAnnouncementDocuments',
               foreignKeyColumn: 'announcement_id',
               mode: 'upsert',
               conflictTarget: ['announcement_id', 'storage_bucket', 'storage_path'],
               ignoreDuplicates: false,
               extraColumns: (ctx) => ({
                    file_name: ctx.meta?.fileName,
                    mime_type: ctx.meta?.mimeType,
               }),
          },
          getUploadOptions: (ctx) => ({
               cacheControl: DEFAULT_CACHE_CONTROL,
               upsert: true,
               contentType: determineAnnouncementDocumentContentType(String(ctx.meta?.mimeType ?? 'application/octet-stream')),
          }),
          revalidate: () => ['/dashboard/announcements', '/dashboard/announcements/tenant'],
          returnSignedUrls: true,
     },
     'poll-attachment': {
          bucket: DEFAULT_BUCKET,
          requiresAuth: true,
          getPathSegments: ({ userId, entityId }) => {
               return ['clients', ensureValue(userId, 'userId is required'), 'polls', ensureValue(entityId, 'entityId is required'), 'images'];
          },
          validateFile: ({ file }) => {
               const type = ((file as any)?.type || '').toString();
               if (!type.startsWith('image/')) {
                    return { ok: false, error: 'Only image files are allowed' };
               }
               return { ok: true };
          },
          db: {
               table: TABLES.POLL_ATTACHMENTS ?? 'tblPollAttachments',
               foreignKeyColumn: 'poll_id',
               mode: 'insert',
               extraColumns: () => {
                    const now = new Date().toISOString();
                    return {
                         created_at: now,
                         updated_at: now,
                         is_cover_image: false,
                    };
               },
          },
          revalidate: (entityId) => [`/dashboard/polls/${entityId}`, `/dashboard/polls`, '/dashboard/polls/voting'],
          supportsCover: {
               column: 'is_cover_image',
               match: (entityId) => ({ poll_id: entityId }),
          },
     },
     'post-image': {
          bucket: DEFAULT_BUCKET,
          requiresAuth: true,
          getPathSegments: ({ userId, entityId }) => {
               return ['clients', ensureValue(userId, 'userId is required'), 'posts', ensureValue(entityId, 'entityId is required'), 'images'];
          },
          validateFile: ({ file }) => {
               const type = ((file as any)?.type || '').toString();
               if (!type.startsWith('image/')) {
                    return { ok: false, error: 'Only image files are allowed' };
               }
               return { ok: true };
          },
          db: {
               table: TABLES.TENANT_POST_IMAGES ?? 'tblTenantPostImages',
               foreignKeyColumn: 'post_id',
               mode: 'insert',
               conflictTarget: ['post_id', 'storage_bucket', 'storage_path'],
               ignoreDuplicates: true,
          },
          revalidate: () => ['/dashboard/social/feed', '/dashboard/social/profile'],
          returnSignedUrls: true,
     },
     'post-document': {
          bucket: DEFAULT_BUCKET,
          requiresAuth: true,
          getPathSegments: ({ userId, entityId }) => {
               return ['clients', ensureValue(userId, 'userId is required'), 'posts', ensureValue(entityId, 'entityId is required'), 'docs'];
          },
          validateFile: validateAnnouncementDocumentFile,
          db: {
               table: TABLES.TENANT_POST_DOCUMENTS ?? 'tblTenantPostDocuments',
               foreignKeyColumn: 'post_id',
               mode: 'insert',
               conflictTarget: undefined,
               ignoreDuplicates: true,
               extraColumns: (ctx) => ({
                    file_name: ctx.meta?.fileName,
                    mime_type: ctx.meta?.mimeType,
               }),
          },
          getUploadOptions: (ctx) => ({
               cacheControl: DEFAULT_CACHE_CONTROL,
               upsert: true,
               contentType: determineAnnouncementDocumentContentType(String(ctx.meta?.mimeType ?? 'application/octet-stream')),
          }),
          revalidate: () => ['/dashboard/social/feed', '/dashboard/social/profile'],
          returnSignedUrls: true,
     },
     'incident-image': {
          bucket: DEFAULT_BUCKET,
          requiresAuth: true,
          getPathSegments: ({ userId, entityId }) => {
               return ['clients', ensureValue(userId, 'userId is required'), 'incidents', ensureValue(entityId, 'entityId is required'), 'images'];
          },
          validateFile: ({ file }) => {
               const type = ((file as any)?.type || '').toString();
               if (!type.startsWith('image/')) {
                    return { ok: false, error: 'Only image files are allowed' };
               }
               return { ok: true };
          },
          db: {
               table: TABLES.INCIDENT_REPORT_IMAGES ?? 'tblIncidentReportImages',
               foreignKeyColumn: 'incident_id',
               mode: 'insert',
               extraColumns: (ctx) => {
                    const now = new Date().toISOString();
                    return {
                         building_id: ctx.meta?.buildingId ?? ctx.meta?.building_id,
                         apartment_id: ctx.meta?.apartmentId ?? ctx.meta?.apartment_id ?? null,
                         created_at: now,
                         updated_at: now,
                    };
               },
          },
          revalidate: (entityId) => [`/dashboard/service-requests/${entityId}`, '/dashboard/service-requests'],
     },
};

export const uploadEntityFiles = async (
     params: UploadEntityFilesParams,
): Promise<UploadEntityFilesResult> => {
     const startedAt = Date.now();
     const config = ENTITY_CONFIG[params.entity];
     if (!config) {
          return { success: false, error: `Unsupported storage entity: ${params.entity}` };
     }

     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = config.bucket ?? DEFAULT_BUCKET;
     let userId: string | undefined;

     try {
          if (config.requiresAuth !== false) {
               const auth = await requireAuthUserId(supabase, `storage.upload.${params.entity}`, {
                    entityId: params.entityId,
               });
               if (!auth.ok) {
                    return { success: false, error: auth.error };
               }
               userId = auth.userId;
          }

          if (!params.files.length) {
               await logServerAction({
                    action: `storage.upload.${params.entity}`,
                    duration_ms: Date.now() - startedAt,
                    error: '',
                    payload: { entityId: params.entityId, files: 0 },
                    status: 'success',
                    type: 'storage',
                    user_id: userId ?? null,
               });
               return { success: true, records: [], signedUrls: [] };
          }

          const storageRefs: { bucket: string; path: string; ctx: PathContext }[] = [];
          const dbRows: Record<string, unknown>[] = [];
          const seenPaths = new Set<string>();

          for (let index = 0; index < params.files.length; index += 1) {
               const file = params.files[index];
               const ctx: PathContext = {
                    entityId: params.entityId,
                    clientId: params.clientId,
                    userId,
                    file,
                    index,
                    meta: {
                         buildingId: params.buildingId,
                         apartmentId: params.apartmentId ?? null,
                         uploaded_by_profile_id: params.profileId ?? null,
                    },
               };

               if (config.validateFile) {
                    const validation = config.validateFile(ctx);
                    if (!validation.ok) {
                         await logServerAction({
                              action: `storage.upload.${params.entity}`,
                              duration_ms: Date.now() - startedAt,
                              error: validation.error ?? 'Invalid file',
                              payload: { entityId: params.entityId, fileIndex: index },
                              status: 'fail',
                              type: 'storage',
                              user_id: userId ?? null,
                         });
                         return { success: false, error: validation.error ?? 'Invalid file' };
                    }
                    ctx.meta = { ...(ctx.meta ?? {}), ...(validation.meta ?? {}) };
               }

               const segments = config.getPathSegments(ctx);
               if (!segments || segments.some((segment) => !segment)) {
                    await logServerAction({
                         action: `storage.upload.${params.entity}`,
                         duration_ms: Date.now() - startedAt,
                         error: 'Invalid storage path configuration',
                         payload: { entityId: params.entityId },
                         status: 'fail',
                         type: 'storage',
                         user_id: userId ?? null,
                    });
                    return { success: false, error: 'Invalid storage path configuration' };
               }

               const sanitizedSegments = segments.map(sanitizeSegmentForS3);
               const storagePath = [...sanitizedSegments, sanitizeSegmentForS3(file.name)].join('/');

               if (seenPaths.has(storagePath)) {
                    continue;
               }
               seenPaths.add(storagePath);

               const uploadOptions = {
                    ...defaultUploadOptions(ctx),
                    ...(config.getUploadOptions ? config.getUploadOptions(ctx) : {}),
               };

               const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, file, uploadOptions);
               if (uploadError) {
                    log(`Error uploading file to storage: ${uploadError.message}`, 'error');
                    await logServerAction({
                         action: `storage.upload.${params.entity}`,
                         duration_ms: Date.now() - startedAt,
                         error: uploadError.message,
                         payload: { entityId: params.entityId, path: storagePath },
                         status: 'fail',
                         type: 'storage',
                         user_id: userId ?? null,
                    });
                    return { success: false, error: uploadError.message };
               }
               storageRefs.push({ bucket, path: storagePath, ctx });

               if (config.db) {
                    const extra = config.db.extraColumns ? config.db.extraColumns(ctx) : {};
                    dbRows.push({
                         [config.db.foreignKeyColumn]: params.entityId,
                         storage_bucket: bucket,
                         storage_path: storagePath,
                         ...extra,
                    });
               }
          }

          let records: Record<string, unknown>[] | undefined;
          if (config.db && dbRows.length) {
               const table = config.db.table;
               const conflict = config.db.conflictTarget?.join(',');

               if (config.db.mode === 'insert') {
                    const { data, error } = await supabase.from(table).insert(dbRows).select();
                    if (error) {
                         await logServerAction({
                              action: `storage.upload.${params.entity}`,
                              duration_ms: Date.now() - startedAt,
                              error: error.message,
                              payload: { entityId: params.entityId },
                              status: 'fail',
                              type: 'db',
                              user_id: userId ?? null,
                         });
                         return { success: false, error: error.message };
                    }
                    records = data ?? [];
               } else {
                    const { data, error } = await supabase
                         .from(table)
                         .upsert(dbRows, {
                              onConflict: conflict,
                              ignoreDuplicates: config.db.ignoreDuplicates ?? false,
                         })
                         .select();
                    if (error) {
                         await logServerAction({
                              action: `storage.upload.${params.entity}`,
                              duration_ms: Date.now() - startedAt,
                              error: error.message,
                              payload: { entityId: params.entityId },
                              status: 'fail',
                              type: 'db',
                              user_id: userId ?? null,
                         });
                         return { success: false, error: error.message };
                    }

                    records = data ?? [];
               }

               if (records.length && records.length !== storageRefs.length) {
                    const byPath = new Map(records.map((row) => [row.storage_path, row]));
                    records = storageRefs
                         .map((ref) => byPath.get(ref.path))
                         .filter((row): row is Record<string, unknown> => Boolean(row));
               }
          }

          let signedUrls: string[] | undefined;

          if (config.returnSignedUrls && storageRefs.length) {
               const { data, error } = await supabase.storage
                    .from(bucket)
                    .createSignedUrls(storageRefs.map((ref) => ref.path), SIGNED_URL_TTL_SECONDS);

               if (error || !data) {
                    log(`Error creating signed URLs: ${error?.message}`, 'error');
                    await logServerAction({
                         action: `storage.upload.${params.entity}`,
                         duration_ms: Date.now() - startedAt,
                         error: error?.message ?? 'Failed to create signed URLs',
                         payload: { entityId: params.entityId },
                         status: 'fail',
                         type: 'storage',
                         user_id: userId ?? null,
                    });
                    return { success: false, error: error?.message ?? 'Failed to create signed URLs' };
               }

               signedUrls = data.map((entry) => entry.signedUrl || '').filter(Boolean);
          }

          if (config.revalidate) {
               for (const path of config.revalidate(params.entityId)) {
                    revalidatePath(path);
               }
          }

          await logServerAction({
               action: `storage.upload.${params.entity}`,
               duration_ms: Date.now() - startedAt,
               error: '',
               payload: { entityId: params.entityId, files: storageRefs.length },
               status: 'success',
               type: 'storage',
               user_id: userId ?? null,
          });

          return { success: true, records, signedUrls };
     } catch (error: any) {
          log(`Unexpected error during storage upload: ${error?.message ?? 'Unknown error'}`, 'error');
          await logServerAction({
               action: `storage.upload.${params.entity}`,
               duration_ms: Date.now() - startedAt,
               error: error?.message ?? 'Unexpected error',
               payload: { entityId: params.entityId },
               status: 'fail',
               type: 'storage',
               user_id: userId ?? null,
          });
          return { success: false, error: error?.message ?? 'Unexpected error' };
     }
};

export const removeEntityFile = async (
     params: RemoveEntityFileParams,
): Promise<BasicResult> => {
     const startedAt = Date.now();
     const config = ENTITY_CONFIG[params.entity];

     if (!config) {
          return { success: false, error: `Unsupported storage entity: ${params.entity}` };
     }

     const supabase = await useServerSideSupabaseAnonClient();
     const defaultBucket = config.bucket ?? DEFAULT_BUCKET;

     try {
          const ref = toStorageRef(params.storagePathOrUrl) ?? { bucket: defaultBucket, path: params.storagePathOrUrl };
          const bucket = ref.bucket ?? defaultBucket;
          const path = ref.path;

          const { error: storageError } = await supabase.storage.from(bucket).remove([path]);
          if (storageError) {
               await logServerAction({
                    action: `storage.remove.${params.entity}`,
                    duration_ms: Date.now() - startedAt,
                    error: storageError.message,
                    payload: { entityId: params.entityId, path },
                    status: 'fail',
                    type: 'storage',
                    user_id: null,
               });
               return { success: false, error: storageError.message };
          }

          if (config.db) {
               const table = config.db.table;
               const primaryMatch = {
                    [config.db.foreignKeyColumn]: params.entityId,
                    storage_bucket: bucket,
                    storage_path: path,
               } as Record<string, unknown>;

               const { error: dbError } = await supabase.from(table).delete().match(primaryMatch);

               if (dbError) {
                    const fallbackMatch = {
                         [config.db.foreignKeyColumn]: params.entityId,
                         storage_path: path,
                    } as Record<string, unknown>;

                    const { error: fallbackError } = await supabase.from(table).delete().match(fallbackMatch);
                    if (fallbackError) {
                         await logServerAction({
                              action: `storage.remove.${params.entity}`,
                              duration_ms: Date.now() - startedAt,
                              error: fallbackError.message,
                              payload: { entityId: params.entityId, path },
                              status: 'fail',
                              type: 'db',
                              user_id: null,
                         });
                         return { success: false, error: fallbackError.message };
                    }
               }
          }
          if (config.revalidate) {
               for (const url of config.revalidate(params.entityId)) {
                    revalidatePath(url);
               }
          }

          await logServerAction({
               action: `storage.remove.${params.entity}`,
               duration_ms: Date.now() - startedAt,
               error: '',
               payload: { entityId: params.entityId, path },
               status: 'success',
               type: 'storage',
               user_id: null,
          });

          return { success: true };
     } catch (error: any) {
          await logServerAction({
               action: `storage.remove.${params.entity}`,
               duration_ms: Date.now() - startedAt,
               error: error?.message ?? 'Unexpected error',
               payload: { entityId: params.entityId },
               status: 'fail',
               type: 'storage',
               user_id: null,
          });
          return { success: false, error: error?.message ?? 'Unexpected error' };
     }
};

export const removeAllEntityFiles = async (
     params: RemoveAllEntityFilesParams,
): Promise<BasicResult> => {
     const startedAt = Date.now();
     const config = ENTITY_CONFIG[params.entity];

     if (!config) {
          return { success: false, error: `Unsupported storage entity: ${params.entity}` };
     }

     if (!config.db) {
          return { success: false, error: 'removeAllEntityFiles is not supported for this entity' };
     }

     const supabase = await useServerSideSupabaseAnonClient();
     const defaultBucket = config.bucket ?? DEFAULT_BUCKET;

     try {
          const { data, error } = await supabase
               .from(config.db.table)
               .select('storage_bucket, storage_path')
               .eq(config.db.foreignKeyColumn, params.entityId);

          if (error) {
               await logServerAction({
                    action: `storage.removeAll.${params.entity}`,
                    duration_ms: Date.now() - startedAt,
                    error: error.message,
                    payload: { entityId: params.entityId },
                    status: 'fail',
                    type: 'db',
                    user_id: null,
               });
               return { success: false, error: error.message };
          }

          const rows = data ?? [];
          if (!rows.length) {
               await logServerAction({
                    action: `storage.removeAll.${params.entity}`,
                    duration_ms: Date.now() - startedAt,
                    error: '',
                    payload: { entityId: params.entityId, removed: 0 },
                    status: 'success',
                    type: 'storage',
                    user_id: null,
               });
               return { success: true };
          }

          const grouped = new Map<string, string[]>();
          for (const row of rows as Array<{ storage_bucket?: string | null; storage_path?: string | null }>) {
               if (!row.storage_path) continue;
               const bucket = row.storage_bucket ?? defaultBucket;
               const list = grouped.get(bucket) ?? [];
               list.push(row.storage_path);
               grouped.set(bucket, list);
          }

          for (const [bucket, paths] of grouped) {
               if (!paths.length) continue;
               const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
               if (removeError) {
                    await logServerAction({
                         action: `storage.removeAll.${params.entity}`,
                         duration_ms: Date.now() - startedAt,
                         error: removeError.message,
                         payload: { entityId: params.entityId, bucket },
                         status: 'fail',
                         type: 'storage',
                         user_id: null,
                    });
                    return { success: false, error: removeError.message };
               }
          }

          const { error: deleteRowsError } = await supabase
               .from(config.db.table)
               .delete()
               .eq(config.db.foreignKeyColumn, params.entityId);

          if (deleteRowsError) {
               await logServerAction({
                    action: `storage.removeAll.${params.entity}`,
                    duration_ms: Date.now() - startedAt,
                    error: deleteRowsError.message,
                    payload: { entityId: params.entityId },
                    status: 'fail',
                    type: 'db',
                    user_id: null,
               });
               return { success: false, error: deleteRowsError.message };
          }

          if (config.revalidate) {
               for (const path of config.revalidate(params.entityId)) {
                    revalidatePath(path);
               }
          }

          await logServerAction({
               action: `storage.removeAll.${params.entity}`,
               duration_ms: Date.now() - startedAt,
               error: '',
               payload: { entityId: params.entityId, removed: rows.length },
               status: 'success',
               type: 'storage',
               user_id: null,
          });

          return { success: true };
     } catch (error: any) {
          await logServerAction({
               action: `storage.removeAll.${params.entity}`,
               duration_ms: Date.now() - startedAt,
               error: error?.message ?? 'Unexpected error',
               payload: { entityId: params.entityId },
               status: 'fail',
               type: 'storage',
               user_id: null,
          });
          return { success: false, error: error?.message ?? 'Unexpected error' };
     }
};

// -------------------------------------------------------
// Generic file manager helpers (Supabase Storage wrappers)
// These do not modify the existing entity-specific helpers.
// -------------------------------------------------------

export type StorageObjectType = 'file' | 'folder';

export interface StorageObjectItem {
     bucket: string;
     name: string;
     path: string;
     type: StorageObjectType;
     size?: number;
     created_at?: string | null;
     updated_at?: string | null;
     last_accessed_at?: string | null;
}

export interface ListStorageObjectsParams {
     bucket?: string;
     prefix?: string;
     limit?: number;
     offset?: number;
     search?: string;
     requiresAuth?: boolean;
}

const normalizePrefix = (prefix?: string): string => {
     if (!prefix) return '';
     const trimmed = prefix.replace(/^\//, '').replace(/\/$/, '');
     return trimmed;
};

const sanitizePath = (path: string): string => {
     const parts = path.split('/').filter(Boolean).map(sanitizeSegmentForS3);
     return parts.join('/');
};

const FOLDER_PLACEHOLDER = '.placeholder';

export const listStorageObjects = async (
     params: ListStorageObjectsParams = {},
): Promise<{ success: boolean; items?: StorageObjectItem[]; error?: string }> => {
     const bucket = params.bucket ?? DEFAULT_BUCKET;
     const prefix = normalizePrefix(params.prefix);
     const supabase = await useServerSideSupabaseAnonClient();

     if (params.requiresAuth !== false) {
          const auth = await requireAuthUserId(supabase, 'storage.list.objects', { prefix, bucket });
          if (!auth.ok) {
               return { success: false, error: auth.error };
          }
     }

     const { data, error } = await supabase.storage.from(bucket).list(prefix || undefined, {
          limit: params.limit,
          offset: params.offset,
          search: params.search,
          sortBy: { column: 'name', order: 'asc' },
     });

     if (error) {
          return { success: false, error: error.message };
     }

     const items: StorageObjectItem[] = (data ?? [])
          .filter((entry) => entry.name !== FOLDER_PLACEHOLDER && !entry.name.startsWith('.'))
          .map((entry) => {
               const isFolder = entry.metadata === null;
               const path = [prefix, entry.name].filter(Boolean).join('/');
               return {
                    bucket,
                    name: entry.name,
                    path,
                    type: isFolder ? 'folder' : 'file',
                    size: entry.metadata?.size ?? undefined,
                    created_at: entry.created_at ?? null,
                    updated_at: entry.updated_at ?? null,
                    last_accessed_at: entry.last_accessed_at ?? null,
               };
          });

     return { success: true, items };
};

export interface UploadStorageObjectParams {
     bucket?: string;
     path: string;
     file: File;
     cacheControl?: string;
     upsert?: boolean;
     requiresAuth?: boolean;
}

export const uploadStorageObject = async (
     params: UploadStorageObjectParams,
): Promise<{ success: boolean; error?: string; path?: string }> => {
     const bucket = params.bucket ?? DEFAULT_BUCKET;
     const supabase = await useServerSideSupabaseAnonClient();
     const sanitizedPath = sanitizePath(params.path);

     if (params.requiresAuth !== false) {
          const auth = await requireAuthUserId(supabase, 'storage.upload.object', { path: sanitizedPath, bucket });
          if (!auth.ok) {
               return { success: false, error: auth.error };
          }
     }

     const { error } = await supabase.storage.from(bucket).upload(sanitizedPath, params.file, {
          cacheControl: params.cacheControl ?? DEFAULT_CACHE_CONTROL,
          upsert: params.upsert ?? false,
          contentType: ((params.file as any)?.type as string | undefined) || undefined,
     });

     if (error) {
          return { success: false, error: error.message };
     }

     return { success: true, path: sanitizedPath };
};

export interface RemoveStorageObjectParams {
     bucket?: string;
     path: string;
     requiresAuth?: boolean;
}

export const removeStorageObject = async (
     params: RemoveStorageObjectParams,
): Promise<BasicResult> => {
     const bucket = params.bucket ?? DEFAULT_BUCKET;
     const supabase = await useServerSideSupabaseAnonClient();
     const normalized = sanitizePath(params.path);

     if (params.requiresAuth !== false) {
          const auth = await requireAuthUserId(supabase, 'storage.remove.object', { path: normalized, bucket });
          if (!auth.ok) {
               return { success: false, error: auth.error };
          }
     }

     const { error } = await supabase.storage.from(bucket).remove([normalized]);
     if (error) {
          return { success: false, error: error.message };
     }

     return { success: true };
};

export interface CreateStorageFolderParams {
     bucket?: string;
     prefix?: string;
     folderName: string;
     requiresAuth?: boolean;
}

export const createStorageFolder = async (
     params: CreateStorageFolderParams,
): Promise<{ success: boolean; error?: string; path?: string }> => {
     const bucket = params.bucket ?? DEFAULT_BUCKET;
     const supabase = await useServerSideSupabaseAnonClient();
     const base = normalizePrefix(params.prefix);
     const folderSegment = sanitizeSegmentForS3(params.folderName);
     const folderPath = [base, folderSegment].filter(Boolean).join('/');
     const placeholderPath = `${folderPath}/${FOLDER_PLACEHOLDER}`;
     const blob = new Blob([''], { type: 'application/octet-stream' });

     if (params.requiresAuth !== false) {
          const auth = await requireAuthUserId(supabase, 'storage.create.folder', { folderPath, bucket });
          if (!auth.ok) {
               return { success: false, error: auth.error };
          }
     }

     const { error } = await supabase.storage.from(bucket).upload(placeholderPath, blob, {
          upsert: false,
          cacheControl: '60',
     });

     if (error && error.message && !error.message.toLowerCase().includes('duplicate')) {
          return { success: false, error: error.message };
     }

     return { success: true, path: folderPath };
};

export interface RemoveStorageFolderParams {
     bucket?: string;
     prefix: string;
     requiresAuth?: boolean;
}

const listAllPathsRecursive = async (
     supabase: Awaited<ReturnType<typeof useServerSideSupabaseAnonClient>>,
     bucket: string,
     prefix: string,
): Promise<string[]> => {
     const paths: string[] = [];
     let offset = 0;
     const limit = 100;
     while (true) {
          const { data, error } = await supabase.storage.from(bucket).list(prefix || undefined, {
               limit,
               offset,
               sortBy: { column: 'name', order: 'asc' },
          });
          if (error) {
               throw new Error(error.message);
          }
          const entries = data ?? [];
          for (const entry of entries) {
               const currentPath = [prefix, entry.name].filter(Boolean).join('/');
               if (entry.metadata === null) {
                    const nested = await listAllPathsRecursive(supabase, bucket, currentPath);
                    paths.push(...nested);
               } else {
                    paths.push(currentPath);
               }
          }
          if (entries.length < limit) break;
          offset += limit;
     }
     // Remove placeholder files used for folder creation, if any.
     const keepPath = [prefix, '.keep'].filter(Boolean).join('/');
     paths.push(keepPath);
     return paths;
};

export const removeStorageFolder = async (
     params: RemoveStorageFolderParams,
): Promise<BasicResult> => {
     const bucket = params.bucket ?? DEFAULT_BUCKET;
     const supabase = await useServerSideSupabaseAnonClient();
     const normalizedPrefix = normalizePrefix(params.prefix);

     if (params.requiresAuth !== false) {
          const auth = await requireAuthUserId(supabase, 'storage.remove.folder', { prefix: normalizedPrefix, bucket });
          if (!auth.ok) {
               return { success: false, error: auth.error };
          }
     }

     try {
          const paths = await listAllPathsRecursive(supabase, bucket, normalizedPrefix);
          if (!paths.length) {
               return { success: true };
          }
          const { error } = await supabase.storage.from(bucket).remove(paths);
          if (error) {
               return { success: false, error: error.message };
          }
          return { success: true };
     } catch (err: any) {
          return { success: false, error: err?.message ?? 'Failed to remove folder' };
     }
};

export const setEntityFileAsCover = async (
     params: SetEntityFileAsCoverParams,
): Promise<BasicResult> => {
     const startedAt = Date.now();
     const config = ENTITY_CONFIG[params.entity];

     if (!config) {
          return { success: false, error: `Unsupported storage entity: ${params.entity}` };
     }

     if (!config.db || !config.supportsCover) {
          return { success: false, error: 'setEntityFileAsCover is not supported for this entity' };
     }

     const supabase = await useServerSideSupabaseAnonClient();
     const table = config.db.table;
     const column = config.supportsCover.column;
     const matchFilter = config.supportsCover.match(params.entityId);

     try {
          const { error: unsetError } = await supabase
               .from(table)
               .update({ [column]: false })
               .match(matchFilter);

          if (unsetError) {
               await logServerAction({
                    action: `storage.setCover.${params.entity}`,
                    duration_ms: Date.now() - startedAt,
                    error: unsetError.message,
                    payload: { entityId: params.entityId },
                    status: 'fail',
                    type: 'db',
                    user_id: null,
               });
               return { success: false, error: unsetError.message };
          }

          const { error: setError } = await supabase
               .from(table)
               .update({ [column]: true })
               .match({ id: params.fileId, ...matchFilter });

          if (setError) {
               await logServerAction({
                    action: `storage.setCover.${params.entity}`,
                    duration_ms: Date.now() - startedAt,
                    error: setError.message,
                    payload: { entityId: params.entityId, fileId: params.fileId },
                    status: 'fail',
                    type: 'db',
                    user_id: null,
               });
               return { success: false, error: setError.message };
          }

          if (config.revalidate) {
               for (const path of config.revalidate(params.entityId)) {
                    revalidatePath(path);
               }
          }

          await logServerAction({
               action: `storage.setCover.${params.entity}`,
               duration_ms: Date.now() - startedAt,
               error: '',
               payload: { entityId: params.entityId, fileId: params.fileId },
               status: 'success',
               type: 'db',
               user_id: null,
          });

          return { success: true };
     } catch (error: any) {
          await logServerAction({
               action: `storage.setCover.${params.entity}`,
               duration_ms: Date.now() - startedAt,
               error: error?.message ?? 'Unexpected error',
               payload: { entityId: params.entityId, fileId: params.fileId },
               status: 'fail',
               type: 'db',
               user_id: null,
          });
          return { success: false, error: error?.message ?? 'Unexpected error' };
     }
};
