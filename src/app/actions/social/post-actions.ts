'use server';

import { revalidatePath } from 'next/cache';
import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { getViewer } from 'src/libs/supabase/server-auth';
import { validate as isUUID } from 'uuid';
import type {
     TenantPost,
     CreateTenantPostPayload,
     UpdateTenantPostPayload,
     TenantPostWithAuthor,
     EmojiReaction
} from 'src/types/social';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { computeReactionAggregates } from 'src/utils/social-reactions';

type ActionResponse<T> = {
     success: boolean;
     data?: T;
     error?: string;
};

type LogActionStatus = 'success' | 'fail';

async function logActionResult(
     action: string,
     status: LogActionStatus,
     options?: {
          userId?: string | null;
          payload?: Record<string, any>;
          error?: string;
          durationMs?: number;
          type?: string;
     }
) {
     try {
          await logServerAction({
               user_id: options?.userId ?? null,
               action,
               payload: options?.payload ?? {},
               status,
               error: options?.error ?? '',
               duration_ms: options?.durationMs ?? 0,
               type: 'db',
          });
     } catch (loggingError) {
          console.error(`Failed to log server action (${action})`, loggingError);
     }
}

async function fetchReactionMapsForPosts(
     supabase: any,
     postIds: Array<string | null | undefined>,
     currentUserId: string | null
): Promise<{ reactionMap: Map<string, EmojiReaction[]>; userReactionMap: Map<string, string> }> {
     const ids = postIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
     if (!ids.length) {
          return { reactionMap: new Map(), userReactionMap: new Map() };
     }

     const { data, error } = await supabase
          .from(TABLES.TENANT_POST_LIKES)
          .select('post_id, emoji, tenant_id')
          .in('post_id', ids);

     if (error) {
          console.error('Error loading reactions for posts:', error);
          return { reactionMap: new Map(), userReactionMap: new Map() };
     }

     return computeReactionAggregates(data, currentUserId);
}

const DEFAULT_POST_PAGE_SIZE = 5;
const MAX_POST_PAGE_SIZE = 25;

/**
 * Get all posts with author information
 */
export async function getTenantPosts(buildingId?: string): Promise<ActionResponse<TenantPostWithAuthor[]>> {
     try {
          const action = 'Get Tenant Posts';
          const actionPayload = { buildingId: buildingId ?? null };
          const supabase = await useServerSideSupabaseAnonClient();

          let query = supabase
               .from(TABLES.TENANT_POSTS)
               .select(`
                    *,
                    author:tenant_id (
                         id,
                         first_name,
                         last_name,
                         avatar_url
                    ),
                    likes:tblTenantPostLikes(count)
               `)
               .eq('is_archived', false)

          // If building ID provided, filter by building
          if (buildingId) {
               query = query.eq('building_id', buildingId);
          }

          const { data, error } = await query.order('created_at', { ascending: false });

          if (error) {
               console.error('Error fetching tenant posts:', error);
               await logActionResult(action, 'fail', {
                    payload: { ...actionPayload, details: 'Supabase query' },
                    error: error.message,
               });
               return { success: false, error: error.message };
          }

          const viewer = await getViewer();
          const currentUserId = viewer.tenant?.id || null;
          const postIds = (data || []).map((post: any) => post.id);
          const { reactionMap, userReactionMap } = await fetchReactionMapsForPosts(supabase, postIds, currentUserId);

          const postsWithLikes = (data || []).map((post: any) => {
               const reactions = reactionMap.get(post.id) ?? [];
               const userReaction = userReactionMap.get(post.id) ?? null;
               const likesCount = reactions.reduce((sum, reaction) => sum + reaction.count, 0);
               return {
                    ...post,
                    author: post.author,
                    reactions,
                    userReaction,
                    is_liked: Boolean(userReaction),
                    likes_count: likesCount,
               } as TenantPostWithAuthor;
          });

          await logActionResult(action, 'success', {
               userId: currentUserId,
               payload: { ...actionPayload, resultCount: postsWithLikes.length },
          });
          return { success: true, data: postsWithLikes };
     } catch (error) {
          console.error('Error fetching tenant posts:', error);
          await logActionResult('Get Tenant Posts', 'fail', {
               payload: { buildingId: buildingId ?? null },
               error: error instanceof Error ? error.message : 'Failed to fetch posts',
          });
          return { success: false, error: 'Failed to fetch posts' };
     }
}

/**
 * Get posts with pagination support
 */
export async function getTenantPostsPaginated(options: {
     buildingId?: string;
     limit?: number;
     offset?: number;
}): Promise<ActionResponse<{ posts: TenantPostWithAuthor[]; total: number }>> {
     try {
          const action = 'Get Tenant Posts Paginated';
          const buildingId = options.buildingId;
          const pageSize = Math.min(Math.max(options.limit ?? DEFAULT_POST_PAGE_SIZE, 1), MAX_POST_PAGE_SIZE);
          const offset = Math.max(options.offset ?? 0, 0);
          const supabase = await useServerSideSupabaseAnonClient();

          let query = supabase
               .from(TABLES.TENANT_POSTS)
               .select(`
                    *,
                    author:tenant_id (
                         id,
                         first_name,
                         last_name,
                         avatar_url
                    ),
                    likes:tblTenantPostLikes(count)
               `, { count: 'exact' })
               .eq('is_archived', false);

          if (buildingId) {
               query = query.eq('building_id', buildingId);
          }

          const { data, error, count } = await query
               .order('created_at', { ascending: false })
               .range(offset, offset + pageSize - 1);

          if (error) {
               console.error('Error fetching tenant posts:', error);
               await logActionResult(action, 'fail', {
                    payload: { buildingId: buildingId ?? null, limit: pageSize, offset },
                    error: error.message,
               });
               return { success: false, error: error.message };
          }

          const viewer = await getViewer();
          const currentUserId = viewer.tenant?.id || null;
          const postIds = (data || []).map((post: any) => post.id);
          const { reactionMap, userReactionMap } = await fetchReactionMapsForPosts(supabase, postIds, currentUserId);

          const postsWithLikes = (data || []).map((post: any) => {
               const reactions = reactionMap.get(post.id) ?? [];
               const userReaction = userReactionMap.get(post.id) ?? null;
               const likesCount = reactions.reduce((sum, reaction) => sum + reaction.count, 0);
               return {
                    ...post,
                    author: post.author,
                    reactions,
                    userReaction,
                    is_liked: Boolean(userReaction),
                    likes_count: likesCount,
               } as TenantPostWithAuthor;
          });

          const total = typeof count === 'number' ? count : postsWithLikes.length + offset;

          await logActionResult(action, 'success', {
               userId: currentUserId,
               payload: {
                    buildingId: buildingId ?? null,
                    limit: pageSize,
                    offset,
                    resultCount: postsWithLikes.length,
                    total,
               },
          });
          return { success: true, data: { posts: postsWithLikes, total } };
     } catch (error) {
          console.error('Error fetching tenant posts:', error);
          await logActionResult('Get Tenant Posts Paginated', 'fail', {
               payload: { buildingId: options.buildingId ?? null, limit: options.limit, offset: options.offset },
               error: error instanceof Error ? error.message : 'Failed to fetch posts',
          });
          return { success: false, error: 'Failed to fetch posts' };
     }
}

/**
 * Get a specific post by ID
 */
export async function getTenantPost(postId: string): Promise<ActionResponse<TenantPostWithAuthor>> {
     try {
          const supabase = await useServerSideSupabaseAnonClient();

          const { data, error } = await supabase
               .from(TABLES.TENANT_POSTS)
               .select(`
                    *,
                    author:tenant_id (
                         id,
                         first_name,
                         last_name,
                         avatar_url
                    )
               `)
               .eq('id', postId)
               .single();

          if (error) {
               console.error('Error fetching tenant post:', error);
               return { success: false, error: error.message };
          }

          if (!data) {
               return { success: false, error: 'Post not found' };
          }

          const viewer = await getViewer();
          const currentUserId = viewer.tenant?.id || null;
          const { reactionMap, userReactionMap } = await fetchReactionMapsForPosts(supabase, [postId], currentUserId);
          const reactions = reactionMap.get(postId) ?? [];
          const userReaction = userReactionMap.get(postId) ?? null;
          const likes_count = reactions.reduce((sum, reaction) => sum + reaction.count, 0);

          const postWithAuthor: TenantPostWithAuthor = {
               ...data,
               author: data.author,
               reactions,
               userReaction,
               likes_count,
               is_liked: Boolean(userReaction),
          };

          return { success: true, data: postWithAuthor };
     } catch (error) {
          console.error('Error fetching tenant post:', error);
          return { success: false, error: 'Failed to fetch post' };
     }
}

/**
 * Get posts by current user
 */
export async function getCurrentUserActivePosts(): Promise<ActionResponse<TenantPostWithAuthor[]>> {
     const action = 'Get Current User Posts';
     try {
          const viewer = await getViewer();
          if (!viewer.tenant) {
               await logActionResult(action, 'fail', {
                    error: 'User not authenticated or not a tenant',
               });
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          const { data, error } = await supabase
               .from(TABLES.TENANT_POSTS)
               .select(`
                    *,
                    author:tenant_id (
                         id,
                         first_name,
                         last_name,
                         avatar_url
                    )
               `)
               .eq('tenant_id', viewer.tenant.id)
               .eq('is_archived', false)
               .order('created_at', { ascending: false });

          if (error) {
               console.error('Error fetching user posts:', error);
               await logActionResult(action, 'fail', {
                    userId: viewer.tenant.id,
                    error: error.message,
               });
               return { success: false, error: error.message };
          }

          // Transform and enrich posts
          let enrichedPosts: TenantPostWithAuthor[] = (data || []).map((post: any) => ({
               ...post,
               author: {
                    id: post.author?.id || post.tenant_id,
                    first_name: post.author?.first_name || 'Unknown',
                    last_name: post.author?.last_name || 'User',
                    avatar_url: post.author?.avatar_url,
               },
               tenant_profiles: undefined,
          }));

          // Get post IDs for batch queries
          const postIds = enrichedPosts.map(p => p.id).filter(Boolean) as string[];

          if (postIds.length > 0) {
               const [
                    { data: commentCountData },
                    { data: imagesData },
                    { data: documentsData }
               ] = await Promise.all([
                    supabase
                         .from(TABLES.TENANT_POST_COMMENTS)
                         .select('post_id')
                         .in('post_id', postIds),
                    supabase
                         .from(TABLES.TENANT_POST_IMAGES)
                         .select('*')
                         .in('post_id', postIds),
                    supabase
                         .from(TABLES.TENANT_POST_DOCUMENTS)
                         .select('*')
                         .in('post_id', postIds)
               ]);

               const commentCountMap = new Map<string, number>();
               for (const comment of commentCountData || []) {
                    const postId = (comment as any).post_id;
                    commentCountMap.set(postId, (commentCountMap.get(postId) || 0) + 1);
               }

               const { reactionMap, userReactionMap } = await fetchReactionMapsForPosts(supabase, postIds, viewer.tenant.id);

               enrichedPosts = enrichedPosts.map(p => {
                    const reactions = reactionMap.get(p.id!) ?? [];
                    const userReaction = userReactionMap.get(p.id!) ?? undefined;
                    const likesCount = reactions.reduce((sum, reaction) => sum + reaction.count, 0);
                    return {
                         ...p,
                         likes_count: likesCount,
                         comments_count: commentCountMap.get(p.id!) || 0,
                         reactions,
                         userReaction,
                         is_liked: Boolean(userReaction),
                         images: (imagesData || []).filter((img: any) => img.post_id === p.id),
                         documents: (documentsData || []).filter((doc: any) => doc.post_id === p.id),
                    };
               });
          }

          await logActionResult(action, 'success', {
               userId: viewer.tenant.id,
               payload: { resultCount: enrichedPosts.length },
          });

          return { success: true, data: enrichedPosts };
     } catch (error) {
          console.error('Error fetching user posts:', error);
          await logActionResult(action, 'fail', {
               error: error instanceof Error ? error.message : 'Failed to fetch posts',
          });
          return { success: false, error: 'Failed to fetch posts' };
     }
}

/**
 * Create a new post
 */
export async function createTenantPost(payload: CreateTenantPostPayload): Promise<ActionResponse<TenantPost>> {
     try {
          const action = 'Create Tenant Post';
          const viewer = await getViewer();
          if (!viewer.tenant) {
               await logActionResult(action, 'fail', {
                    payload: { buildingId: payload.building_id ?? null },
                    error: 'User not authenticated or not a tenant',
               });
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          const { data, error } = await supabase
               .from(TABLES.TENANT_POSTS)
               .insert({
                    tenant_id: viewer.tenant.id,
                    content_text: payload.content_text,
                    building_id: payload.building_id,
               })
               .select()
               .single();

          if (error) {
               await logActionResult(action, 'fail', {
                    userId: viewer.tenant.id,
                    payload: {
                         buildingId: payload.building_id ?? null,
                    },
                    error: error.message,
               });
               return { success: false, error: error.message };
          }

          // Revalidate social feed
          revalidatePath('/dashboard/social/feed');
          revalidatePath('/dashboard/social');

          await logActionResult(action, 'success', {
               userId: viewer.tenant.id,
               payload: { postId: data.id },
          });
          return { success: true, data };
     } catch (error) {
          await logActionResult('Create Tenant Post', 'fail', {
               payload: { buildingId: payload.building_id ?? null },
               error: error instanceof Error ? error.message : 'Failed to create post',
          });
          return { success: false, error: 'Failed to create post' };
     }
}

/**
 * Update a post
 */
export async function updateTenantPost(
     postId: string,
     payload: UpdateTenantPostPayload
): Promise<ActionResponse<TenantPost>> {
     try {
          const action = 'Update Tenant Post';
          const viewer = await getViewer();
          if (!viewer.tenant) {
               await logActionResult(action, 'fail', {
                    payload: { postId, updatedFields: Object.keys(payload) },
                    error: 'User not authenticated or not a tenant',
               });
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Verify ownership
          const { data: post } = await supabase
               .from(TABLES.TENANT_POSTS)
               .select('tenant_id')
               .eq('id', postId)
               .single();

          if (!post) {
               await logActionResult(action, 'fail', {
                    userId: viewer.tenant.id,
                    payload: { postId },
                    error: 'Post not found',
               });
               return { success: false, error: 'Post not found' };
          }

          if (post.tenant_id !== viewer.tenant.id) {
               await logActionResult(action, 'fail', {
                    userId: viewer.tenant.id,
                    payload: { postId },
                    error: 'You can only update your own posts',
               });
               return { success: false, error: 'You can only update your own posts' };
          }

          const { data, error } = await supabase
               .from(TABLES.TENANT_POSTS)
               .update({
                    ...payload,
                    updated_at: new Date().toISOString(),
               })
               .eq('id', postId)
               .select()
               .single();

          if (error) {
               console.error('Error updating tenant post:', error);
               await logActionResult(action, 'fail', {
                    userId: viewer.tenant.id,
                    payload: { postId, updatedFields: Object.keys(payload) },
                    error: error.message,
               });
               return { success: false, error: error.message };
          }

          await logActionResult(action, 'success', {
               userId: viewer.tenant.id,
               payload: { postId },
          });
          return { success: true, data };
     } catch (error) {
          console.error('Error updating tenant post:', error);
          await logActionResult('Update Tenant Post', 'fail', {
               payload: { postId, updatedFields: Object.keys(payload) },
               error: error instanceof Error ? error.message : 'Failed to update post',
          });
          return { success: false, error: 'Failed to update post' };
     }
}

/**
 * Delete a post
 */
export async function deleteTenantPost(postId: string): Promise<ActionResponse<void>> {
     try {
          const action = 'Delete Tenant Post';
          const viewer = await getViewer();
          if (!viewer.tenant) {
               await logActionResult(action, 'fail', {
                    payload: { postId },
                    error: 'User not authenticated or not a tenant',
               });
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Verify ownership
          const { data: post } = await supabase
               .from(TABLES.TENANT_POSTS)
               .select('tenant_id')
               .eq('id', postId)
               .single();

          if (!post) {
               await logActionResult(action, 'fail', {
                    userId: viewer.tenant.id,
                    payload: { postId },
                    error: 'Post not found',
               });
               return { success: false, error: 'Post not found' };
          }

          if (post.tenant_id !== viewer.tenant.id) {
               await logActionResult(action, 'fail', {
                    userId: viewer.tenant.id,
                    payload: { postId },
                    error: 'You can only delete your own posts',
               });
               return { success: false, error: 'You can only delete your own posts' };
          }

          // Delete related likes and comments first (if using CASCADE delete in DB, this might be automatic)
          await supabase.from(TABLES.TENANT_POST_LIKES).delete().eq('post_id', postId);
          await supabase.from(TABLES.TENANT_POST_COMMENTS).delete().eq('post_id', postId);

          // Delete the post
          const { error } = await supabase
               .from(TABLES.TENANT_POSTS)
               .delete()
               .eq('id', postId);

          if (error) {
               console.error('Error deleting tenant post:', error);
               await logActionResult(action, 'fail', {
                    userId: viewer.tenant.id,
                    payload: { postId },
                    error: error.message,
               });
               return { success: false, error: error.message };
          }

          revalidatePath('/dashboard/social/feed');
          revalidatePath('/dashboard/social');

          await logActionResult(action, 'success', {
               userId: viewer.tenant.id,
               payload: { postId },
          });
          return { success: true };
     } catch (error) {
          console.error('Error deleting tenant post:', error);
          await logActionResult('Delete Tenant Post', 'fail', {
               payload: { postId },
               error: error instanceof Error ? error.message : 'Failed to delete post',
          });
          return { success: false, error: 'Failed to delete post' };
     }
}

/**
 * Archive a post (soft delete)
 */
export async function archiveTenantPost(postId: string): Promise<ActionResponse<void>> {
     try {
          const action = 'Archive Tenant Post';
          const viewer = await getViewer();
          if (!viewer.tenant) {
               await logActionResult(action, 'fail', {
                    payload: { postId },
                    error: 'User not authenticated or not a tenant',
               });
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Verify ownership
          const { data: post } = await supabase
               .from(TABLES.TENANT_POSTS)
               .select('tenant_id')
               .eq('id', postId)
               .single();

          if (!post) {
               await logActionResult(action, 'fail', {
                    userId: viewer.tenant.id,
                    payload: { postId },
                    error: 'Post not found',
               });
               return { success: false, error: 'Post not found' };
          }

          if (post.tenant_id !== viewer.tenant.id) {
               await logActionResult(action, 'fail', {
                    userId: viewer.tenant.id,
                    payload: { postId },
                    error: 'You can only archive your own posts',
               });
               return { success: false, error: 'You can only archive your own posts' };
          }

          // Archive the post
          const { error } = await supabase
               .from(TABLES.TENANT_POSTS)
               .update({ is_archived: true })
               .eq('id', postId);

          if (error) {
               console.error('Error archiving tenant post:', error);
               await logActionResult(action, 'fail', {
                    userId: viewer.tenant.id,
                    payload: { postId },
                    error: error.message,
               });
               return { success: false, error: error.message };
          }

          revalidatePath('/dashboard/social/feed');
          revalidatePath('/dashboard/social/profile');

          await logActionResult(action, 'success', {
               userId: viewer.tenant.id,
               payload: { postId },
          });
          return { success: true };
     } catch (error) {
          console.error('Error archiving tenant post:', error);
          await logActionResult('Archive Tenant Post', 'fail', {
               payload: { postId },
               error: error instanceof Error ? error.message : 'Failed to archive post',
          });
          return { success: false, error: 'Failed to archive post' };
     }
}

// ============================= EMOJI REACTION OPERATIONS =============================

/**
 * Add an emoji reaction to a post
 */
export async function addEmojiReaction(
     postId: string,
     emoji: string
): Promise<ActionResponse<void>> {
     try {
          const action = 'Add Emoji Reaction';
          const basePayload = { postId, emoji };
          if (!isUUID(postId)) {
               await logActionResult(action, 'fail', {
                    payload: { ...basePayload, reason: 'Invalid UUID' },
                    error: 'Invalid post ID',
               });
               return { success: false, error: 'Invalid post ID' };
          }

          if (!emoji || emoji.trim().length === 0) {
               await logActionResult(action, 'fail', {
                    payload: { ...basePayload, reason: 'Missing emoji' },
                    error: 'Emoji is required',
               });
               return { success: false, error: 'Emoji is required' };
          }

          const viewer = await getViewer();
          if (!viewer.tenant) {
               await logActionResult(action, 'fail', {
                    payload: basePayload,
                    error: 'User not authenticated or not a tenant',
               });
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Check if user already reacted with this emoji
          const { data: existingReaction } = await supabase
               .from(TABLES.TENANT_POST_LIKES)
               .select('id, emoji')
               .eq('post_id', postId)
               .eq('tenant_id', viewer.tenant.id)
               .eq('emoji', emoji)
               .maybeSingle();

          if (existingReaction) {
               await logActionResult(action, 'fail', {
                    userId: viewer.tenant.id,
                    payload: { ...basePayload, reason: 'Duplicate emoji' },
                    error: 'You already reacted with this emoji',
               });
               return { success: false, error: 'You already reacted with this emoji' };
          }

          // Check if user has any reaction on this post
          const { data: anyReaction } = await supabase
               .from(TABLES.TENANT_POST_LIKES)
               .select('id, emoji')
               .eq('post_id', postId)
               .eq('tenant_id', viewer.tenant.id)
               .maybeSingle();

          if (anyReaction) {
               // Update existing reaction to new emoji
               const { error: updateError } = await supabase
                    .from(TABLES.TENANT_POST_LIKES)
                    .update({ emoji })
                    .eq('id', anyReaction.id);

               if (updateError) {
                    await logActionResult(action, 'fail', {
                         userId: viewer.tenant.id,
                         payload: { ...basePayload, reactionId: anyReaction.id, mode: 'update' },
                         error: updateError.message,
                    });
                    return { success: false, error: updateError.message };
               }
          } else {
               // Add new reaction
               const { error: insertError } = await supabase
                    .from(TABLES.TENANT_POST_LIKES)
                    .insert({
                         post_id: postId,
                         tenant_id: viewer.tenant.id,
                         emoji,
                    });

               if (insertError) {
                    await logActionResult(action, 'fail', {
                         userId: viewer.tenant.id,
                         payload: { ...basePayload, mode: 'insert' },
                         error: insertError.message,
                    });
                    return { success: false, error: insertError.message };
               }
          }

          revalidatePath('/dashboard/social/feed');
          revalidatePath('/dashboard/social');

          await logActionResult(action, 'success', {
               userId: viewer.tenant.id,
               payload: basePayload,
          });
          return { success: true };
     } catch (error) {
          console.error('Error adding emoji reaction:', error);
          await logActionResult('Add Emoji Reaction', 'fail', {
               payload: { postId, emoji },
               error: error instanceof Error ? error.message : 'Failed to add reaction',
          });
          return { success: false, error: 'Failed to add reaction' };
     }
}

/**
 * Remove emoji reaction from a post
 */
export async function removeEmojiReaction(postId: string): Promise<ActionResponse<void>> {
     try {
          const action = 'Remove Emoji Reaction';
          if (!isUUID(postId)) {
               await logActionResult(action, 'fail', {
                    payload: { postId, reason: 'Invalid UUID' },
                    error: 'Invalid post ID',
               });
               return { success: false, error: 'Invalid post ID' };
          }

          const viewer = await getViewer();
          if (!viewer.tenant) {
               await logActionResult(action, 'fail', {
                    payload: { postId },
                    error: 'User not authenticated or not a tenant',
               });
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Check if user has a reaction
          const { data: existingReaction } = await supabase
               .from(TABLES.TENANT_POST_LIKES)
               .select('id')
               .eq('post_id', postId)
               .eq('tenant_id', viewer.tenant.id)
               .maybeSingle();

          if (!existingReaction) {
               await logActionResult(action, 'fail', {
                    userId: viewer.tenant.id,
                    payload: { postId },
                    error: 'No reaction found',
               });
               return { success: false, error: 'No reaction found' };
          }

          // Remove reaction
          const { error: deleteError } = await supabase
               .from(TABLES.TENANT_POST_LIKES)
               .delete()
               .eq('id', existingReaction.id);

          if (deleteError) {
               await logActionResult(action, 'fail', {
                    userId: viewer.tenant.id,
                    payload: { postId, reactionId: existingReaction.id },
                    error: deleteError.message,
               });
               return { success: false, error: deleteError.message };
          }

          revalidatePath('/dashboard/social/feed');
          revalidatePath('/dashboard/social');

          await logActionResult(action, 'success', {
               userId: viewer.tenant.id,
               payload: { postId },
          });
          return { success: true };
     } catch (error) {
          console.error('Error removing emoji reaction:', error);
          await logActionResult('Remove Emoji Reaction', 'fail', {
               payload: { postId },
               error: error instanceof Error ? error.message : 'Failed to remove reaction',
          });
          return { success: false, error: 'Failed to remove reaction' };
     }
}

/**
 * Get all reactions for a post
 */
export async function getPostReactions(
     postId: string
): Promise<ActionResponse<{ emoji: string; count: number; userReacted: boolean }[]>> {
     try {
          const action = 'Get Post Reactions';
          if (!isUUID(postId)) {
               await logActionResult(action, 'fail', {
                    payload: { postId, reason: 'Invalid UUID' },
                    error: 'Invalid post ID',
               });
               return { success: false, error: 'Invalid post ID' };
          }

          const viewer = await getViewer();
          if (!viewer.tenant) {
               await logActionResult(action, 'fail', {
                    payload: { postId },
                    error: 'User not authenticated or not a tenant',
               });
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Get all reactions for this post
          const { data: reactions, error } = await supabase
               .from(TABLES.TENANT_POST_LIKES)
               .select('emoji, tenant_id')
               .eq('post_id', postId);

          if (error) {
               await logActionResult(action, 'fail', {
                    userId: viewer.tenant.id,
                    payload: { postId },
                    error: error.message,
               });
               return { success: false, error: error.message };
          }

          // Group by emoji and count
          const emojiMap = new Map<string, { count: number; userReacted: boolean }>();

          for (const reaction of reactions || []) {
               const existing = emojiMap.get(reaction.emoji) || { count: 0, userReacted: false };
               emojiMap.set(reaction.emoji, {
                    count: existing.count + 1,
                    userReacted: existing.userReacted || reaction.tenant_id === viewer.tenant.id,
               });
          }

          const result = Array.from(emojiMap.entries()).map(([emoji, data]) => ({
               emoji,
               count: data.count,
               userReacted: data.userReacted,
          }));

          await logActionResult(action, 'success', {
               userId: viewer.tenant.id,
               payload: { postId, reactionTypes: result.length },
          });
          return { success: true, data: result };
     } catch (error) {
          console.error('Error getting post reactions:', error);
          await logActionResult('Get Post Reactions', 'fail', {
               payload: { postId },
               error: error instanceof Error ? error.message : 'Failed to get reactions',
          });
          return { success: false, error: 'Failed to get reactions' };
     }
}
