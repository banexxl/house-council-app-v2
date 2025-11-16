'use server';

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { TABLES } from 'src/libs/supabase/tables';
import {
     TenantPost,
     CreateTenantPostPayload,
     UpdateTenantPostPayload,
     TenantPostWithAuthor
} from 'src/types/social';
import { validate as isUUID } from 'uuid';
import { toStorageRef } from 'src/utils/sb-bucket';
import { uploadEntityFiles, removeEntityFile } from 'src/libs/supabase/sb-storage';

const DEFAULT_BUCKET = process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

type Ref = { bucket: string; path: string };

function makeRef(
     bucketMaybe: string | null | undefined,
     pathMaybe: string | null | undefined,
     legacyUrl?: string | null
): Ref | null {
     if (pathMaybe) return { bucket: bucketMaybe ?? DEFAULT_BUCKET, path: pathMaybe };
     if (legacyUrl) {
          const parsed = toStorageRef(legacyUrl);
          if (parsed) return parsed;
     }
     return null;
}

async function signMany(
     supabase: Awaited<ReturnType<typeof useServerSideSupabaseAnonClient>>,
     refs: Ref[]
) {
     const out = new Map<string, string>();
     if (!refs?.length) return out;

     // Group & dedupe by bucket
     const byBucket = new Map<string, string[]>();
     for (const r of refs) {
          const arr = byBucket.get(r.bucket) ?? [];
          if (!arr.includes(r.path)) arr.push(r.path);
          byBucket.set(r.bucket, arr);
     }

     for (const [bucket, paths] of byBucket) {
          if (!paths.length) continue;
          const { data, error } = await supabase.storage
               .from(bucket)
               .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
          if (error || !data) continue;
          data.forEach((d, i) => {
               if (d?.signedUrl) out.set(`${bucket}::${paths[i]}`, d.signedUrl);
          });
     }

     return out;
}

// Helper to get current tenant ID from auth user
async function getCurrentTenantId(
     supabase: Awaited<ReturnType<typeof useServerSideSupabaseAnonClient>>
): Promise<{ success: boolean; tenantId?: string; error?: string }> {
     const { data: userData, error: authError } = await supabase.auth.getUser();

     if (authError || !userData?.user) {
          return { success: false, error: 'Not authenticated' };
     }

     // Get tenant record for this user
     const { data: tenantData, error: tenantError } = await supabase
          .from(TABLES.TENANTS)
          .select('id')
          .eq('user_id', userData.user.id)
          .single();

     if (tenantError || !tenantData) {
          return { success: false, error: 'Tenant not found' };
     }

     return { success: true, tenantId: tenantData.id };
}

// ============================= CREATE OPERATIONS =============================

export async function createTenantPost(
     payload: CreateTenantPostPayload
): Promise<{ success: boolean; error?: string; data?: TenantPost }> {
     const startedAt = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const tenantResult = await getCurrentTenantId(supabase);
     if (!tenantResult.success) {
          await logServerAction({
               user_id: null,
               action: 'createTenantPost',
               duration_ms: Date.now() - startedAt,
               error: tenantResult.error || 'Failed to get tenant ID',
               payload,
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: tenantResult.error };
     }

     const { data, error } = await supabase
          .from(TABLES.TENANT_POSTS)
          .insert({
               tenant_id: tenantResult.tenantId!,
               content_text: payload.content_text,
               building_id: payload.building_id,
          })
          .select()
          .single();

     if (error) {
          await logServerAction({
               user_id: tenantResult.tenantId!,
               action: 'createTenantPost',
               duration_ms: Date.now() - startedAt,
               error: error.message,
               payload,
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          user_id: tenantResult.tenantId!,
          action: 'createTenantPost',
          duration_ms: Date.now() - startedAt,
          error: '',
          payload: { postId: data.id },
          status: 'success',
          type: 'db',
     });

     revalidatePath('/dashboard/social/feed');
     return { success: true, data: data as TenantPost };
}

// ============================= READ OPERATIONS =============================

export async function getTenantPosts(
     buildingId?: string
): Promise<{ success: boolean; error?: string; data?: TenantPostWithAuthor[] }> {
     const startedAt = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const tenantResult = await getCurrentTenantId(supabase);
     if (!tenantResult.success) {
          await logServerAction({
               user_id: null,
               action: 'getTenantPosts',
               duration_ms: Date.now() - startedAt,
               error: tenantResult.error || 'Failed to get tenant ID',
               payload: { buildingId },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: tenantResult.error };
     }

     let query = supabase
          .from(TABLES.TENANT_POSTS)
          .select(`
      *,
      tenant_profiles:tenant_id (
        id,
        first_name,
        last_name,
        avatar_url
      )
    `)
          .order('created_at', { ascending: false }); if (buildingId) {
               query = query.eq('building_id', buildingId);
          }

     const { data, error } = await query;

     if (error) {
          await logServerAction({
               user_id: tenantResult.tenantId!,
               action: 'getTenantPosts',
               duration_ms: Date.now() - startedAt,
               error: error.message,
               payload: { buildingId },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }

     let enriched: TenantPostWithAuthor[] = (data || []).map((post: any) => ({
          ...post,
          author: {
               id: post.tenant_profiles?.id || post.tenant_id,
               first_name: post.tenant_profiles?.first_name || 'Unknown',
               last_name: post.tenant_profiles?.last_name || 'User',
               avatar_url: post.tenant_profiles?.avatar_url,
          },
          tenant_profiles: undefined,
     }));

     // Enrich with signed images and documents
     try {
          const ids = enriched.map(p => p.id).filter(Boolean) as string[];
          if (ids.length > 0) {
               const [{ data: imgRows }, { data: docRows }] = await Promise.all([
                    supabase
                         .from(TABLES.TENANT_POST_IMAGES)
                         .select('post_id, storage_bucket, storage_path')
                         .in('post_id', ids),
                    supabase
                         .from(TABLES.TENANT_POST_DOCUMENTS)
                         .select('post_id, storage_bucket, storage_path, file_name, mime_type')
                         .in('post_id', ids),
               ]);

               // Build refs to sign
               const imageRefs: Ref[] = (imgRows ?? [])
                    .map(r => makeRef((r as any).storage_bucket, (r as any).storage_path))
                    .filter(Boolean) as Ref[];

               const docRefs: Ref[] = (docRows ?? [])
                    .map(r => makeRef((r as any).storage_bucket, (r as any).storage_path))
                    .filter(Boolean) as Ref[];

               const signedMap = await signMany(supabase, [...imageRefs, ...docRefs]);

               // Map post_id → signed image urls
               const imagesMap = new Map<string, string[]>();
               for (const r of imgRows ?? []) {
                    const bucket = (r as any).storage_bucket ?? DEFAULT_BUCKET;
                    const path = (r as any).storage_path;
                    if (!path) continue;

                    const key = `${bucket}::${path}`;
                    const signed = signedMap.get(key);
                    if (!signed) continue;

                    const postId = (r as any).post_id as string;
                    const arr = imagesMap.get(postId) ?? [];
                    arr.push(signed);
                    imagesMap.set(postId, arr);
               }

               // Map post_id → signed doc items
               const docsMap = new Map<string, { url: string; name: string; mime?: string }[]>();
               for (const r of docRows ?? []) {
                    const bucket = (r as any).storage_bucket ?? DEFAULT_BUCKET;
                    const path = (r as any).storage_path;
                    if (!path) continue;

                    const key = `${bucket}::${path}`;
                    const signed = signedMap.get(key);
                    if (!signed) continue;

                    const postId = (r as any).post_id as string;
                    const item = {
                         url: signed,
                         name: (r as any).file_name as string,
                         mime: ((r as any).mime_type as string) || undefined,
                    };
                    const arr = docsMap.get(postId) ?? [];
                    arr.push(item);
                    docsMap.set(postId, arr);
               }

               // Check if current user liked each post
               const { data: likeRows } = await supabase
                    .from(TABLES.TENANT_POST_LIKES)
                    .select('post_id')
                    .in('post_id', ids)
                    .eq('tenant_id', tenantResult.tenantId);

               const likedPostIds = new Set((likeRows || []).map((r: any) => r.post_id));

               // Get like counts for all posts
               const { data: likeCounts } = await supabase
                    .from(TABLES.TENANT_POST_LIKES)
                    .select('post_id')
                    .in('post_id', ids);

               const likeCountMap = new Map<string, number>();
               for (const like of likeCounts || []) {
                    const postId = (like as any).post_id;
                    likeCountMap.set(postId, (likeCountMap.get(postId) || 0) + 1);
               }

               // Get comment counts for all posts
               const { data: commentCounts } = await supabase
                    .from(TABLES.TENANT_POST_COMMENTS)
                    .select('post_id')
                    .in('post_id', ids);

               const commentCountMap = new Map<string, number>();
               for (const comment of commentCounts || []) {
                    const postId = (comment as any).post_id;
                    commentCountMap.set(postId, (commentCountMap.get(postId) || 0) + 1);
               }

               // Attach to each post
               enriched = enriched.map(p => ({
                    ...p,
                    images: imagesMap.get(p.id!) || [],
                    documents: docsMap.get(p.id!) || [],
                    is_liked: likedPostIds.has(p.id!),
                    likes_count: likeCountMap.get(p.id!) || 0,
                    comments_count: commentCountMap.get(p.id!) || 0,
               }));
          }
     } catch (enrichError) {
          console.error('Error enriching posts:', enrichError);
          // Continue with unenriched data
     }

     await logServerAction({
          user_id: tenantResult.tenantId!,
          action: 'getTenantPosts',
          duration_ms: Date.now() - startedAt,
          error: '',
          payload: { buildingId, count: enriched.length },
          status: 'success',
          type: 'db',
     });

     return { success: true, data: enriched };
}

export async function getTenantPostById(
     postId: string
): Promise<{ success: boolean; error?: string; data?: TenantPostWithAuthor }> {
     const startedAt = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     if (!isUUID(postId)) {
          return { success: false, error: 'Invalid post ID' };
     }

     const tenantResult = await getCurrentTenantId(supabase);
     if (!tenantResult.success) {
          await logServerAction({
               user_id: null,
               action: 'getTenantPostById',
               duration_ms: Date.now() - startedAt,
               error: tenantResult.error || 'Failed to get tenant ID',
               payload: { postId },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: tenantResult.error };
     }

     const { data, error } = await supabase
          .from(TABLES.TENANT_POSTS)
          .select(`
      *,
      tenant_profiles:tenant_id (
        id,
        first_name,
        last_name,
        avatar_url
      )
    `)
          .eq('id', postId)
          .single(); if (error) {
               await logServerAction({
                    user_id: tenantResult.tenantId!,
                    action: 'getTenantPostById',
                    duration_ms: Date.now() - startedAt,
                    error: error.message,
                    payload: { postId },
                    status: 'fail',
                    type: 'db',
               });
               return { success: false, error: error.message };
          }

     let enriched: TenantPostWithAuthor = {
          ...data,
          author: {
               id: (data as any).tenant_profiles?.id || data.tenant_id,
               first_name: (data as any).tenant_profiles?.first_name || 'Unknown',
               last_name: (data as any).tenant_profiles?.last_name || 'User',
               avatar_url: (data as any).tenant_profiles?.avatar_url,
          },
          tenant_profiles: undefined,
     };

     // Enrich with signed images and documents
     try {
          const [{ data: imgRows }, { data: docRows }, { data: likeRow }, { data: allLikes }, { data: allComments }] = await Promise.all([
               supabase
                    .from(TABLES.TENANT_POST_IMAGES)
                    .select('storage_bucket, storage_path')
                    .eq('post_id', postId),
               supabase
                    .from(TABLES.TENANT_POST_DOCUMENTS)
                    .select('storage_bucket, storage_path, file_name, mime_type')
                    .eq('post_id', postId),
               supabase
                    .from(TABLES.TENANT_POST_LIKES)
                    .select('id')
                    .eq('post_id', postId)
                    .eq('tenant_id', tenantResult.tenantId)
                    .maybeSingle(),
               supabase
                    .from(TABLES.TENANT_POST_LIKES)
                    .select('id')
                    .eq('post_id', postId),
               supabase
                    .from(TABLES.TENANT_POST_COMMENTS)
                    .select('id')
                    .eq('post_id', postId),
          ]);

          const imageRefs: Ref[] = (imgRows ?? [])
               .map(r => makeRef((r as any).storage_bucket, (r as any).storage_path))
               .filter(Boolean) as Ref[];

          const docRefs: Ref[] = (docRows ?? [])
               .map(r => makeRef((r as any).storage_bucket, (r as any).storage_path))
               .filter(Boolean) as Ref[];

          const signedMap = await signMany(supabase, [...imageRefs, ...docRefs]);

          const images: string[] = [];
          for (const r of imgRows ?? []) {
               const bucket = (r as any).storage_bucket ?? DEFAULT_BUCKET;
               const path = (r as any).storage_path;
               if (!path) continue;

               const key = `${bucket}::${path}`;
               const signed = signedMap.get(key);
               if (signed) images.push(signed);
          }

          const documents: { url: string; name: string; mime?: string }[] = [];
          for (const r of docRows ?? []) {
               const bucket = (r as any).storage_bucket ?? DEFAULT_BUCKET;
               const path = (r as any).storage_path;
               if (!path) continue;

               const key = `${bucket}::${path}`;
               const signed = signedMap.get(key);
               if (signed) {
                    documents.push({
                         url: signed,
                         name: (r as any).file_name as string,
                         mime: ((r as any).mime_type as string) || undefined,
                    });
               }
          }

          enriched = {
               ...enriched,
               images,
               documents,
               is_liked: !!likeRow,
               likes_count: allLikes?.length || 0,
               comments_count: allComments?.length || 0,
          };
     } catch (enrichError) {
          console.error('Error enriching post:', enrichError);
     }

     await logServerAction({
          user_id: tenantResult.tenantId!,
          action: 'getTenantPostById',
          duration_ms: Date.now() - startedAt,
          error: '',
          payload: { postId },
          status: 'success',
          type: 'db',
     });

     return { success: true, data: enriched };
}

// ============================= UPDATE OPERATIONS =============================

export async function updateTenantPost(
     postId: string,
     payload: UpdateTenantPostPayload
): Promise<{ success: boolean; error?: string; data?: TenantPost }> {
     const startedAt = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     if (!isUUID(postId)) {
          return { success: false, error: 'Invalid post ID' };
     }

     const tenantResult = await getCurrentTenantId(supabase);
     if (!tenantResult.success) {
          await logServerAction({
               user_id: null,
               action: 'updateTenantPost',
               duration_ms: Date.now() - startedAt,
               error: tenantResult.error || 'Failed to get tenant ID',
               payload: { postId, ...payload },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: tenantResult.error };
     }

     // Verify ownership
     const { data: existingPost, error: checkError } = await supabase
          .from(TABLES.TENANT_POSTS)
          .select('tenant_id')
          .eq('id', postId)
          .single();

     if (checkError || !existingPost) {
          await logServerAction({
               user_id: tenantResult.tenantId!,
               action: 'updateTenantPost',
               duration_ms: Date.now() - startedAt,
               error: 'Post not found',
               payload: { postId },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: 'Post not found' };
     }

     if (existingPost.tenant_id !== tenantResult.tenantId) {
          await logServerAction({
               user_id: tenantResult.tenantId!,
               action: 'updateTenantPost',
               duration_ms: Date.now() - startedAt,
               error: 'Not authorized to update this post',
               payload: { postId },
               status: 'fail',
               type: 'auth',
          });
          return { success: false, error: 'Not authorized to update this post' };
     }

     const { data, error } = await supabase
          .from(TABLES.TENANT_POSTS)
          .update({
               content_text: payload.content_text,
               updated_at: new Date().toISOString(),
          })
          .eq('id', postId)
          .select()
          .single();

     if (error) {
          await logServerAction({
               user_id: tenantResult.tenantId!,
               action: 'updateTenantPost',
               duration_ms: Date.now() - startedAt,
               error: error.message,
               payload: { postId, ...payload },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          user_id: tenantResult.tenantId!,
          action: 'updateTenantPost',
          duration_ms: Date.now() - startedAt,
          error: '',
          payload: { postId },
          status: 'success',
          type: 'db',
     });

     revalidatePath('/dashboard/social/feed');
     return { success: true, data: data as TenantPost };
}

// ============================= DELETE OPERATIONS =============================

export async function deleteTenantPost(
     postId: string
): Promise<{ success: boolean; error?: string }> {
     const startedAt = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     if (!isUUID(postId)) {
          return { success: false, error: 'Invalid post ID' };
     }

     const tenantResult = await getCurrentTenantId(supabase);
     if (!tenantResult.success) {
          await logServerAction({
               user_id: null,
               action: 'deleteTenantPost',
               duration_ms: Date.now() - startedAt,
               error: tenantResult.error || 'Failed to get tenant ID',
               payload: { postId },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: tenantResult.error };
     }

     // Verify ownership
     const { data: existingPost, error: checkError } = await supabase
          .from(TABLES.TENANT_POSTS)
          .select('tenant_id')
          .eq('id', postId)
          .single();

     if (checkError || !existingPost) {
          await logServerAction({
               user_id: tenantResult.tenantId!,
               action: 'deleteTenantPost',
               duration_ms: Date.now() - startedAt,
               error: 'Post not found',
               payload: { postId },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: 'Post not found' };
     }

     if (existingPost.tenant_id !== tenantResult.tenantId) {
          await logServerAction({
               user_id: tenantResult.tenantId!,
               action: 'deleteTenantPost',
               duration_ms: Date.now() - startedAt,
               error: 'Not authorized to delete this post',
               payload: { postId },
               status: 'fail',
               type: 'auth',
          });
          return { success: false, error: 'Not authorized to delete this post' };
     }

     // Delete associated images and documents from database (storage deletion handled by DB triggers)
     await Promise.all([
          supabase.from(TABLES.TENANT_POST_IMAGES).delete().eq('post_id', postId),
          supabase.from(TABLES.TENANT_POST_DOCUMENTS).delete().eq('post_id', postId),
          supabase.from(TABLES.TENANT_POST_LIKES).delete().eq('post_id', postId),
          supabase.from(TABLES.TENANT_POST_COMMENTS).delete().eq('post_id', postId),
     ]);

     const { error } = await supabase
          .from(TABLES.TENANT_POSTS)
          .delete()
          .eq('id', postId);

     if (error) {
          await logServerAction({
               user_id: tenantResult.tenantId!,
               action: 'deleteTenantPost',
               duration_ms: Date.now() - startedAt,
               error: error.message,
               payload: { postId },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          user_id: tenantResult.tenantId!,
          action: 'deleteTenantPost',
          duration_ms: Date.now() - startedAt,
          error: '',
          payload: { postId },
          status: 'success',
          type: 'db',
     });

     revalidatePath('/dashboard/social/feed');
     return { success: true };
}

// ============================= ATTACHMENT OPERATIONS =============================

export async function uploadPostImages(
     postId: string,
     files: File[]
): Promise<{ success: boolean; error?: string; signedUrls?: string[] }> {
     const startedAt = Date.now();

     if (!isUUID(postId)) {
          return { success: false, error: 'Invalid post ID' };
     }

     const supabase = await useServerSideSupabaseAnonClient();
     const tenantResult = await getCurrentTenantId(supabase);

     if (!tenantResult.success) {
          await logServerAction({
               user_id: null,
               action: 'uploadPostImages',
               duration_ms: Date.now() - startedAt,
               error: tenantResult.error || 'Failed to get tenant ID',
               payload: { postId, fileCount: files.length },
               status: 'fail',
               type: 'storage',
          });
          return { success: false, error: tenantResult.error };
     }

     // Verify post ownership
     const { data: post, error: checkError } = await supabase
          .from(TABLES.TENANT_POSTS)
          .select('tenant_id')
          .eq('id', postId)
          .single();

     if (checkError || !post || post.tenant_id !== tenantResult.tenantId) {
          return { success: false, error: 'Post not found or unauthorized' };
     }

     const result = await uploadEntityFiles({
          entity: 'post-image',
          entityId: postId,
          files,
     });

     await logServerAction({
          user_id: tenantResult.tenantId!,
          action: 'uploadPostImages',
          duration_ms: Date.now() - startedAt,
          error: result.error || '',
          payload: { postId, fileCount: files.length },
          status: result.success ? 'success' : 'fail',
          type: 'storage',
     });

     if (result.success) {
          revalidatePath('/dashboard/social/feed');
     }

     return result;
}

export async function uploadPostDocuments(
     postId: string,
     files: File[]
): Promise<{ success: boolean; error?: string; signedUrls?: string[] }> {
     const startedAt = Date.now();

     if (!isUUID(postId)) {
          return { success: false, error: 'Invalid post ID' };
     }

     const supabase = await useServerSideSupabaseAnonClient();
     const tenantResult = await getCurrentTenantId(supabase);

     if (!tenantResult.success) {
          await logServerAction({
               user_id: null,
               action: 'uploadPostDocuments',
               duration_ms: Date.now() - startedAt,
               error: tenantResult.error || 'Failed to get tenant ID',
               payload: { postId, fileCount: files.length },
               status: 'fail',
               type: 'storage',
          });
          return { success: false, error: tenantResult.error };
     }

     // Verify post ownership
     const { data: post, error: checkError } = await supabase
          .from(TABLES.TENANT_POSTS)
          .select('tenant_id')
          .eq('id', postId)
          .single();

     if (checkError || !post || post.tenant_id !== tenantResult.tenantId) {
          return { success: false, error: 'Post not found or unauthorized' };
     }

     const result = await uploadEntityFiles({
          entity: 'post-document',
          entityId: postId,
          files,
     });

     await logServerAction({
          user_id: tenantResult.tenantId!,
          action: 'uploadPostDocuments',
          duration_ms: Date.now() - startedAt,
          error: result.error || '',
          payload: { postId, fileCount: files.length },
          status: result.success ? 'success' : 'fail',
          type: 'storage',
     });

     if (result.success) {
          revalidatePath('/dashboard/social/feed');
     }

     return result;
}

export async function removePostAttachment(
     postId: string,
     storagePathOrUrl: string,
     type: 'image' | 'document'
): Promise<{ success: boolean; error?: string }> {
     const startedAt = Date.now();

     if (!isUUID(postId)) {
          return { success: false, error: 'Invalid post ID' };
     }

     const supabase = await useServerSideSupabaseAnonClient();
     const tenantResult = await getCurrentTenantId(supabase);

     if (!tenantResult.success) {
          await logServerAction({
               user_id: null,
               action: 'removePostAttachment',
               duration_ms: Date.now() - startedAt,
               error: tenantResult.error || 'Failed to get tenant ID',
               payload: { postId, type },
               status: 'fail',
               type: 'storage',
          });
          return { success: false, error: tenantResult.error };
     }

     // Verify post ownership
     const { data: post, error: checkError } = await supabase
          .from(TABLES.TENANT_POSTS)
          .select('tenant_id')
          .eq('id', postId)
          .single();

     if (checkError || !post || post.tenant_id !== tenantResult.tenantId) {
          return { success: false, error: 'Post not found or unauthorized' };
     }

     const entity = type === 'image' ? 'post-image' : 'post-document';
     const result = await removeEntityFile({
          entity,
          entityId: postId,
          storagePathOrUrl,
     });

     await logServerAction({
          user_id: tenantResult.tenantId!,
          action: 'removePostAttachment',
          duration_ms: Date.now() - startedAt,
          error: result.error || '',
          payload: { postId, type },
          status: result.success ? 'success' : 'fail',
          type: 'storage',
     });

     if (result.success) {
          revalidatePath('/dashboard/social/feed');
     }

     return result;
}

// ============================= EMOJI REACTION OPERATIONS =============================

export async function addEmojiReaction(
     postId: string,
     emoji: string
): Promise<{ success: boolean; error?: string }> {
     const startedAt = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     if (!isUUID(postId)) {
          return { success: false, error: 'Invalid post ID' };
     }

     if (!emoji || emoji.trim().length === 0) {
          return { success: false, error: 'Emoji is required' };
     }

     const tenantResult = await getCurrentTenantId(supabase);
     if (!tenantResult.success) {
          await logServerAction({
               user_id: null,
               action: 'addEmojiReaction',
               duration_ms: Date.now() - startedAt,
               error: tenantResult.error || 'Failed to get tenant ID',
               payload: { postId, emoji },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: tenantResult.error };
     }

     // Check if user already reacted with this emoji
     const { data: existingReaction } = await supabase
          .from(TABLES.TENANT_POST_LIKES)
          .select('id, emoji')
          .eq('post_id', postId)
          .eq('tenant_id', tenantResult.tenantId)
          .eq('emoji', emoji)
          .maybeSingle();

     if (existingReaction) {
          return { success: false, error: 'You already reacted with this emoji' };
     }

     // Check if user has any reaction on this post
     const { data: anyReaction } = await supabase
          .from(TABLES.TENANT_POST_LIKES)
          .select('id, emoji')
          .eq('post_id', postId)
          .eq('tenant_id', tenantResult.tenantId)
          .maybeSingle();

     if (anyReaction) {
          // Update existing reaction to new emoji
          const { error: updateError } = await supabase
               .from(TABLES.TENANT_POST_LIKES)
               .update({ emoji })
               .eq('id', anyReaction.id);

          if (updateError) {
               await logServerAction({
                    user_id: tenantResult.tenantId!,
                    action: 'addEmojiReaction',
                    duration_ms: Date.now() - startedAt,
                    error: updateError.message,
                    payload: { postId, emoji, action: 'update' },
                    status: 'fail',
                    type: 'db',
               });
               return { success: false, error: updateError.message };
          }
     } else {
          // Add new reaction
          const { error: insertError } = await supabase
               .from(TABLES.TENANT_POST_LIKES)
               .insert({
                    post_id: postId,
                    tenant_id: tenantResult.tenantId!,
                    emoji,
               });

          if (insertError) {
               await logServerAction({
                    user_id: tenantResult.tenantId!,
                    action: 'addEmojiReaction',
                    duration_ms: Date.now() - startedAt,
                    error: insertError.message,
                    payload: { postId, emoji, action: 'insert' },
                    status: 'fail',
                    type: 'db',
               });
               return { success: false, error: insertError.message };
          }
     }

     await logServerAction({
          user_id: tenantResult.tenantId!,
          action: 'addEmojiReaction',
          duration_ms: Date.now() - startedAt,
          error: '',
          payload: { postId, emoji },
          status: 'success',
          type: 'db',
     });

     revalidatePath('/dashboard/social/feed');
     return { success: true };
}

export async function removeEmojiReaction(
     postId: string
): Promise<{ success: boolean; error?: string }> {
     const startedAt = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     if (!isUUID(postId)) {
          return { success: false, error: 'Invalid post ID' };
     }

     const tenantResult = await getCurrentTenantId(supabase);
     if (!tenantResult.success) {
          await logServerAction({
               user_id: null,
               action: 'removeEmojiReaction',
               duration_ms: Date.now() - startedAt,
               error: tenantResult.error || 'Failed to get tenant ID',
               payload: { postId },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: tenantResult.error };
     }

     // Check if user has a reaction
     const { data: existingReaction } = await supabase
          .from(TABLES.TENANT_POST_LIKES)
          .select('id')
          .eq('post_id', postId)
          .eq('tenant_id', tenantResult.tenantId)
          .maybeSingle();

     if (!existingReaction) {
          return { success: false, error: 'No reaction found' };
     }

     // Remove reaction
     const { error: deleteError } = await supabase
          .from(TABLES.TENANT_POST_LIKES)
          .delete()
          .eq('id', existingReaction.id);

     if (deleteError) {
          await logServerAction({
               user_id: tenantResult.tenantId!,
               action: 'removeEmojiReaction',
               duration_ms: Date.now() - startedAt,
               error: deleteError.message,
               payload: { postId },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: deleteError.message };
     }

     await logServerAction({
          user_id: tenantResult.tenantId!,
          action: 'removeEmojiReaction',
          duration_ms: Date.now() - startedAt,
          error: '',
          payload: { postId },
          status: 'success',
          type: 'db',
     });

     revalidatePath('/dashboard/social/feed');
     return { success: true };
}

export async function getPostReactions(
     postId: string
): Promise<{ success: boolean; error?: string; data?: { emoji: string; count: number; userReacted: boolean }[] }> {
     const startedAt = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     if (!isUUID(postId)) {
          return { success: false, error: 'Invalid post ID' };
     }

     const tenantResult = await getCurrentTenantId(supabase);
     if (!tenantResult.success) {
          await logServerAction({
               user_id: null,
               action: 'getPostReactions',
               duration_ms: Date.now() - startedAt,
               error: tenantResult.error || 'Failed to get tenant ID',
               payload: { postId },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: tenantResult.error };
     }

     // Get all reactions for this post
     const { data: reactions, error } = await supabase
          .from(TABLES.TENANT_POST_LIKES)
          .select('emoji, tenant_id')
          .eq('post_id', postId);

     if (error) {
          await logServerAction({
               user_id: tenantResult.tenantId!,
               action: 'getPostReactions',
               duration_ms: Date.now() - startedAt,
               error: error.message,
               payload: { postId },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }

     // Group by emoji and count
     const emojiMap = new Map<string, { count: number; userReacted: boolean }>();

     for (const reaction of reactions || []) {
          const existing = emojiMap.get(reaction.emoji) || { count: 0, userReacted: false };
          emojiMap.set(reaction.emoji, {
               count: existing.count + 1,
               userReacted: existing.userReacted || reaction.tenant_id === tenantResult.tenantId,
          });
     }

     const result = Array.from(emojiMap.entries()).map(([emoji, data]) => ({
          emoji,
          count: data.count,
          userReacted: data.userReacted,
     }));

     await logServerAction({
          user_id: tenantResult.tenantId!,
          action: 'getPostReactions',
          duration_ms: Date.now() - startedAt,
          error: '',
          payload: { postId, count: result.length },
          status: 'success',
          type: 'db',
     });

     return { success: true, data: result };
}