'use server';

import { revalidatePath } from 'next/cache';
import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { getViewer } from 'src/libs/supabase/server-auth';
import { uploadEntityFiles, removeEntityFile } from 'src/libs/supabase/sb-storage';
import { validate as isUUID } from 'uuid';
import type {
     TenantPost,
     CreateTenantPostPayload,
     UpdateTenantPostPayload,
     TenantPostWithAuthor
} from 'src/types/social';

type ActionResponse<T> = {
     success: boolean;
     data?: T;
     error?: string;
};

/**
 * Get all posts with author information
 */
export async function getTenantPosts(buildingId?: string): Promise<ActionResponse<TenantPostWithAuthor[]>> {
     try {
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
                    likes:tenant_post_likes(count)
               `)

          // If building ID provided, filter by building
          if (buildingId) {
               query = query.eq('building_id', buildingId);
          }

          const { data, error } = await query.order('created_at', { ascending: false });

          if (error) {
               console.error('Error fetching tenant posts:', error);
               return { success: false, error: error.message };
          }

          // Get current user to check if they liked each post
          const viewer = await getViewer();
          const currentUserId = viewer.tenant?.id || null;

          // Transform data to include like status
          const postsWithLikes = await Promise.all(
               (data || []).map(async (post: any) => {
                    let is_liked = false;

                    if (currentUserId) {
                         const { data: likeData } = await supabase
                              .from(TABLES.TENANT_POST_LIKES)
                              .select('id')
                              .eq('post_id', post.id)
                              .eq('tenant_id', currentUserId)
                              .single();

                         is_liked = !!likeData;
                    }

                    return {
                         ...post,
                         author: post.author,
                         is_liked,
                    } as TenantPostWithAuthor;
               })
          );

          return { success: true, data: postsWithLikes };
     } catch (error) {
          console.error('Error fetching tenant posts:', error);
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

          // Check if current user liked this post
          const viewer = await getViewer();
          let is_liked = false;

          if (viewer.tenant) {
               const { data: likeData } = await supabase
                    .from(TABLES.TENANT_POST_LIKES)
                    .select('id')
                    .eq('post_id', postId)
                    .eq('tenant_id', viewer.tenant.id)
                    .single();

               is_liked = !!likeData;
          }

          const postWithAuthor: TenantPostWithAuthor = {
               ...data,
               author: data.author,
               is_liked,
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
export async function getCurrentUserPosts(): Promise<ActionResponse<TenantPostWithAuthor[]>> {
     try {
          const viewer = await getViewer();
          if (!viewer.tenant) {
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          const { data, error } = await supabase
               .from(TABLES.TENANT_POSTS)
               .select('*')
               .eq('tenant_id', viewer.tenant.id)
               .order('created_at', { ascending: false });

          if (error) {
               console.error('Error fetching user posts:', error);
               return { success: false, error: error.message };
          }

          return { success: true, data: data || [] };
     } catch (error) {
          console.error('Error fetching user posts:', error);
          return { success: false, error: 'Failed to fetch posts' };
     }
}

/**
 * Create a new post
 */
export async function createTenantPost(payload: CreateTenantPostPayload): Promise<ActionResponse<TenantPost>> {
     try {
          const viewer = await getViewer();
          if (!viewer.tenant) {
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();
          console.log('payload', payload);

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
               console.error('Error creating tenant post:', error);
               return { success: false, error: error.message };
          }

          // Revalidate social feed
          revalidatePath('/dashboard/social/feed');
          revalidatePath('/dashboard/social');

          return { success: true, data };
     } catch (error) {
          console.error('Error creating tenant post:', error);
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
          const viewer = await getViewer();
          if (!viewer.tenant) {
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
               return { success: false, error: 'Post not found' };
          }

          if (post.tenant_id !== viewer.tenant.id) {
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
               return { success: false, error: error.message };
          }

          return { success: true, data };
     } catch (error) {
          console.error('Error updating tenant post:', error);
          return { success: false, error: 'Failed to update post' };
     }
}

/**
 * Delete a post
 */
export async function deleteTenantPost(postId: string): Promise<ActionResponse<void>> {
     try {
          const viewer = await getViewer();
          if (!viewer.tenant) {
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
               return { success: false, error: 'Post not found' };
          }

          if (post.tenant_id !== viewer.tenant.id) {
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
               return { success: false, error: error.message };
          }

          revalidatePath('/dashboard/social/feed');
          revalidatePath('/dashboard/social');

          return { success: true };
     } catch (error) {
          console.error('Error deleting tenant post:', error);
          return { success: false, error: 'Failed to delete post' };
     }
}

// ============================= FILE UPLOAD OPERATIONS =============================

/**
 * Upload images for a post
 */
export async function uploadPostImages(
     postId: string,
     files: File[]
): Promise<ActionResponse<{ signedUrls: string[] }>> {
     try {
          if (!isUUID(postId)) {
               return { success: false, error: 'Invalid post ID' };
          }

          const viewer = await getViewer();
          if (!viewer.tenant) {
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Verify post ownership
          const { data: post, error: checkError } = await supabase
               .from(TABLES.TENANT_POSTS)
               .select('tenant_id')
               .eq('id', postId)
               .single();

          if (checkError || !post || post.tenant_id !== viewer.tenant.id) {
               return { success: false, error: 'Post not found or unauthorized' };
          }

          const result = await uploadEntityFiles({
               entity: 'post-image',
               entityId: postId,
               files,
          });

          if (result.success) {
               revalidatePath('/dashboard/social/feed');
               revalidatePath('/dashboard/social');
               return { success: true, data: { signedUrls: result.signedUrls || [] } };
          }

          return { success: false, error: result.error };
     } catch (error) {
          console.error('Error uploading post images:', error);
          return { success: false, error: 'Failed to upload images' };
     }
}

/**
 * Upload documents for a post
 */
export async function uploadPostDocuments(
     postId: string,
     files: File[]
): Promise<ActionResponse<{ signedUrls: string[] }>> {
     try {
          if (!isUUID(postId)) {
               return { success: false, error: 'Invalid post ID' };
          }

          const viewer = await getViewer();
          if (!viewer.tenant) {
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Verify post ownership
          const { data: post, error: checkError } = await supabase
               .from(TABLES.TENANT_POSTS)
               .select('tenant_id')
               .eq('id', postId)
               .single();

          if (checkError || !post || post.tenant_id !== viewer.tenant.id) {
               return { success: false, error: 'Post not found or unauthorized' };
          }

          const result = await uploadEntityFiles({
               entity: 'post-document',
               entityId: postId,
               files,
          });

          if (result.success) {
               revalidatePath('/dashboard/social/feed');
               revalidatePath('/dashboard/social');
               return { success: true, data: { signedUrls: result.signedUrls || [] } };
          }

          return { success: false, error: result.error };
     } catch (error) {
          console.error('Error uploading post documents:', error);
          return { success: false, error: 'Failed to upload documents' };
     }
}

/**
 * Remove an attachment from a post
 */
export async function removePostAttachment(
     postId: string,
     storagePathOrUrl: string,
     type: 'image' | 'document'
): Promise<ActionResponse<void>> {
     try {
          if (!isUUID(postId)) {
               return { success: false, error: 'Invalid post ID' };
          }

          const viewer = await getViewer();
          if (!viewer.tenant) {
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Verify post ownership
          const { data: post, error: checkError } = await supabase
               .from(TABLES.TENANT_POSTS)
               .select('tenant_id')
               .eq('id', postId)
               .single();

          if (checkError || !post || post.tenant_id !== viewer.tenant.id) {
               return { success: false, error: 'Post not found or unauthorized' };
          }

          const entity = type === 'image' ? 'post-image' : 'post-document';
          const result = await removeEntityFile({
               entity,
               entityId: postId,
               storagePathOrUrl,
          });

          if (result.success) {
               revalidatePath('/dashboard/social/feed');
               revalidatePath('/dashboard/social');
               return { success: true };
          }

          return { success: false, error: result.error };
     } catch (error) {
          console.error('Error removing post attachment:', error);
          return { success: false, error: 'Failed to remove attachment' };
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
          if (!isUUID(postId)) {
               return { success: false, error: 'Invalid post ID' };
          }

          if (!emoji || emoji.trim().length === 0) {
               return { success: false, error: 'Emoji is required' };
          }

          const viewer = await getViewer();
          if (!viewer.tenant) {
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
                    return { success: false, error: insertError.message };
               }
          }

          revalidatePath('/dashboard/social/feed');
          revalidatePath('/dashboard/social');

          return { success: true };
     } catch (error) {
          console.error('Error adding emoji reaction:', error);
          return { success: false, error: 'Failed to add reaction' };
     }
}

/**
 * Remove emoji reaction from a post
 */
export async function removeEmojiReaction(postId: string): Promise<ActionResponse<void>> {
     try {
          if (!isUUID(postId)) {
               return { success: false, error: 'Invalid post ID' };
          }

          const viewer = await getViewer();
          if (!viewer.tenant) {
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
               return { success: false, error: 'No reaction found' };
          }

          // Remove reaction
          const { error: deleteError } = await supabase
               .from(TABLES.TENANT_POST_LIKES)
               .delete()
               .eq('id', existingReaction.id);

          if (deleteError) {
               return { success: false, error: deleteError.message };
          }

          revalidatePath('/dashboard/social/feed');
          revalidatePath('/dashboard/social');

          return { success: true };
     } catch (error) {
          console.error('Error removing emoji reaction:', error);
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
          if (!isUUID(postId)) {
               return { success: false, error: 'Invalid post ID' };
          }

          const viewer = await getViewer();
          if (!viewer.tenant) {
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Get all reactions for this post
          const { data: reactions, error } = await supabase
               .from(TABLES.TENANT_POST_LIKES)
               .select('emoji, tenant_id')
               .eq('post_id', postId);

          if (error) {
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

          return { success: true, data: result };
     } catch (error) {
          console.error('Error getting post reactions:', error);
          return { success: false, error: 'Failed to get reactions' };
     }
}