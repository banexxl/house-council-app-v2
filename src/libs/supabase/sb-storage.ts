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
     | 'post-document';

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
          getPathSegments: ({ clientId, userId }) => {
               const owner = clientId ?? userId;
               return ['clients', ensureValue(owner, 'clientId or userId is required'), 'images', 'logos'];
          },
          returnSignedUrls: true,
          revalidate: (entityId) => [`/dashboard/clients/${entityId}`, `/dashboard/clients`],
     },
     'building-image': {
          bucket: DEFAULT_BUCKET,
          requiresAuth: true,
          getPathSegments: ({ clientId, userId, entityId }) => {
               const owner = clientId ?? userId;
               return ['clients', ensureValue(owner, 'clientId or userId is required'), 'buildings', ensureValue(entityId, 'entityId is required'), 'images'];
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
          getPathSegments: ({ clientId, entityId }) => {
               return ['clients', ensureValue(clientId, 'clientId is required'), 'polls', ensureValue(entityId, 'entityId is required'), 'images'];
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
                    ctx.meta = validation.meta;
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
