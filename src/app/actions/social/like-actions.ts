'use server';

import { revalidatePath } from 'next/cache';
import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { getViewer } from 'src/libs/supabase/server-auth';
import type {
     TenantPostLike,
     CreateTenantPostLikePayload
} from 'src/types/social';

type ActionResponse<T> = {
     success: boolean;
     data?: T;
     error?: string;
};

/**
 * Toggle like on a post (like if not liked, unlike if already liked)
 */
export async function togglePostLike(postId: string): Promise<ActionResponse<{ liked: boolean; likesCount: number }>> {
     try {
          const viewer = await getViewer();
          if (!viewer.tenant) {
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Check if user already liked this post
          const { data: existingLike } = await supabase
               .from(TABLES.TENANT_POST_LIKES)
               .select('id')
               .eq('post_id', postId)
               .eq('tenant_id', viewer.tenant.id)
               .single();

          let liked = false;
          let likesCount = 0;

          if (existingLike) {
               // Unlike: remove the like
               const { error: deleteError } = await supabase
                    .from(TABLES.TENANT_POST_LIKES)
                    .delete()
                    .eq('id', existingLike.id);

               if (deleteError) {
                    console.error('Error removing like:', deleteError);
                    return { success: false, error: deleteError.message };
               }

               // Decrement likes count
               const { data: currentPost } = await supabase
                    .from(TABLES.TENANT_POSTS)
                    .select('likes_count')
                    .eq('id', postId)
                    .single();

               const newLikesCount = Math.max(0, (currentPost?.likes_count || 0) - 1);

               const { data: updatedPost, error: updateError } = await supabase
                    .from(TABLES.TENANT_POSTS)
                    .update({ likes_count: newLikesCount })
                    .eq('id', postId)
                    .select('likes_count')
                    .single();

               if (updateError) {
                    console.error('Error updating likes count:', updateError);
                    return { success: false, error: updateError.message };
               }

               liked = false;
               likesCount = updatedPost?.likes_count || 0;
          } else {
               // Like: add a new like
               const { error: insertError } = await supabase
                    .from(TABLES.TENANT_POST_LIKES)
                    .insert({
                         post_id: postId,
                         tenant_id: viewer.tenant.id,
                    });

               if (insertError) {
                    console.error('Error adding like:', insertError);
                    return { success: false, error: insertError.message };
               }

               // Increment likes count
               const { data: currentPost } = await supabase
                    .from(TABLES.TENANT_POSTS)
                    .select('likes_count')
                    .eq('id', postId)
                    .single();

               const newLikesCount = (currentPost?.likes_count || 0) + 1;

               const { data: updatedPost, error: updateError } = await supabase
                    .from(TABLES.TENANT_POSTS)
                    .update({ likes_count: newLikesCount })
                    .eq('id', postId)
                    .select('likes_count')
                    .single();

               if (updateError) {
                    console.error('Error updating likes count:', updateError);
                    return { success: false, error: updateError.message };
               }

               liked = true;
               likesCount = updatedPost?.likes_count || 0;
          }

          // Optionally revalidate the path where posts are displayed
          revalidatePath('/dashboard/social');

          return { success: true, data: { liked, likesCount } };
     } catch (error) {
          console.error('Error toggling post like:', error);
          return { success: false, error: 'Failed to toggle like' };
     }
}

/**
 * Get likes for a post
 */
export async function getPostLikes(postId: string): Promise<ActionResponse<TenantPostLike[]>> {
     try {
          const supabase = await useServerSideSupabaseAnonClient();

          const { data, error } = await supabase
               .from(TABLES.TENANT_POST_LIKES)
               .select(`
                    *,
                    tenant:tenant_id (
                         id,
                         first_name,
                         last_name,
                         avatar_url
                    )
               `)
               .eq('post_id', postId)
               .order('created_at', { ascending: false });

          if (error) {
               console.error('Error fetching post likes:', error);
               return { success: false, error: error.message };
          }

          return { success: true, data: data || [] };
     } catch (error) {
          console.error('Error fetching post likes:', error);
          return { success: false, error: 'Failed to fetch likes' };
     }
}

/**
 * Check if current user liked a post
 */
export async function checkUserLikedPost(postId: string): Promise<ActionResponse<boolean>> {
     try {
          const viewer = await getViewer();
          if (!viewer.tenant) {
               return { success: true, data: false };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          const { data, error } = await supabase
               .from(TABLES.TENANT_POST_LIKES)
               .select('id')
               .eq('post_id', postId)
               .eq('tenant_id', viewer.tenant.id)
               .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
               console.error('Error checking user like:', error);
               return { success: false, error: error.message };
          }

          return { success: true, data: !!data };
     } catch (error) {
          console.error('Error checking user like:', error);
          return { success: false, error: 'Failed to check like status' };
     }
}