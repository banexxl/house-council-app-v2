'use server';

import { revalidatePath } from 'next/cache';
import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { getViewer } from 'src/libs/supabase/server-auth';
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
               .eq('is_public', true);

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
export async function getCurrentUserPosts(): Promise<ActionResponse<TenantPost[]>> {
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

          const { data, error } = await supabase
               .from(TABLES.TENANT_POSTS)
               .insert({
                    tenant_id: viewer.tenant.id,
                    ...payload,
                    likes_count: 0,
                    comments_count: 0,
                    is_public: payload.is_public ?? true,
               })
               .select()
               .single();

          if (error) {
               console.error('Error creating tenant post:', error);
               return { success: false, error: error.message };
          }

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

          return { success: true };
     } catch (error) {
          console.error('Error deleting tenant post:', error);
          return { success: false, error: 'Failed to delete post' };
     }
}