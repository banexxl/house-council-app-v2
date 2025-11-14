'use server';

import { revalidatePath } from 'next/cache';
import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { getViewer } from 'src/libs/supabase/server-auth';
import type {
     TenantPostComment,
     CreateTenantPostCommentPayload,
     UpdateTenantPostCommentPayload,
     TenantPostCommentWithAuthor
} from 'src/types/social';

type ActionResponse<T> = {
     success: boolean;
     data?: T;
     error?: string;
};

/**
 * Get comments for a post
 */
export async function getPostComments(postId: string): Promise<ActionResponse<TenantPostCommentWithAuthor[]>> {
     try {
          const supabase = await useServerSideSupabaseAnonClient();

          const { data, error } = await supabase
               .from(TABLES.TENANT_POST_COMMENTS)
               .select(`
                    *,
                    author:tenant_id (
                         id,
                         first_name,
                         last_name,
                         avatar_url
                    )
               `)
               .eq('post_id', postId)
               .order('created_at', { ascending: true }); // Show oldest comments first

          if (error) {
               console.error('Error fetching post comments:', error);
               return { success: false, error: error.message };
          }

          // Transform data to include author information
          const commentsWithAuthor = (data || []).map((comment: any) => ({
               ...comment,
               author: comment.author,
          })) as TenantPostCommentWithAuthor[];

          return { success: true, data: commentsWithAuthor };
     } catch (error) {
          console.error('Error fetching post comments:', error);
          return { success: false, error: 'Failed to fetch comments' };
     }
}

/**
 * Create a new comment
 */
export async function createTenantPostComment(payload: CreateTenantPostCommentPayload): Promise<ActionResponse<TenantPostComment>> {
     try {
          const viewer = await getViewer();
          if (!viewer.tenant) {
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Create the comment
          const { data, error } = await supabase
               .from(TABLES.TENANT_POST_COMMENTS)
               .insert({
                    tenant_id: viewer.tenant.id,
                    ...payload,
               })
               .select()
               .single();

          if (error) {
               console.error('Error creating comment:', error);
               return { success: false, error: error.message };
          }

          // Increment comments count on the post
          const { data: currentPost } = await supabase
               .from(TABLES.TENANT_POSTS)
               .select('comments_count')
               .eq('id', payload.post_id)
               .single();

          const newCommentsCount = (currentPost?.comments_count || 0) + 1;

          await supabase
               .from(TABLES.TENANT_POSTS)
               .update({ comments_count: newCommentsCount })
               .eq('id', payload.post_id);

          // Optionally revalidate the path where posts are displayed
          revalidatePath('/dashboard/social');

          return { success: true, data };
     } catch (error) {
          console.error('Error creating comment:', error);
          return { success: false, error: 'Failed to create comment' };
     }
}

/**
 * Update a comment
 */
export async function updateTenantPostComment(
     commentId: string,
     payload: UpdateTenantPostCommentPayload
): Promise<ActionResponse<TenantPostComment>> {
     try {
          const viewer = await getViewer();
          if (!viewer.tenant) {
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Verify ownership
          const { data: comment } = await supabase
               .from(TABLES.TENANT_POST_COMMENTS)
               .select('tenant_id')
               .eq('id', commentId)
               .single();

          if (!comment) {
               return { success: false, error: 'Comment not found' };
          }

          if (comment.tenant_id !== viewer.tenant.id) {
               return { success: false, error: 'You can only update your own comments' };
          }

          const { data, error } = await supabase
               .from(TABLES.TENANT_POST_COMMENTS)
               .update({
                    ...payload,
                    updated_at: new Date().toISOString(),
               })
               .eq('id', commentId)
               .select()
               .single();

          if (error) {
               console.error('Error updating comment:', error);
               return { success: false, error: error.message };
          }

          // Optionally revalidate the path where posts are displayed
          revalidatePath('/dashboard/social');

          return { success: true, data };
     } catch (error) {
          console.error('Error updating comment:', error);
          return { success: false, error: 'Failed to update comment' };
     }
}

/**
 * Delete a comment
 */
export async function deleteTenantPostComment(commentId: string): Promise<ActionResponse<void>> {
     try {
          const viewer = await getViewer();
          if (!viewer.tenant) {
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Verify ownership and get post_id for updating count
          const { data: comment } = await supabase
               .from(TABLES.TENANT_POST_COMMENTS)
               .select('tenant_id, post_id')
               .eq('id', commentId)
               .single();

          if (!comment) {
               return { success: false, error: 'Comment not found' };
          }

          if (comment.tenant_id !== viewer.tenant.id) {
               return { success: false, error: 'You can only delete your own comments' };
          }

          // Delete the comment
          const { error } = await supabase
               .from(TABLES.TENANT_POST_COMMENTS)
               .delete()
               .eq('id', commentId);

          if (error) {
               console.error('Error deleting comment:', error);
               return { success: false, error: error.message };
          }

          // Decrement comments count on the post
          const { data: currentPost } = await supabase
               .from(TABLES.TENANT_POSTS)
               .select('comments_count')
               .eq('id', comment.post_id)
               .single();

          const newCommentsCount = Math.max(0, (currentPost?.comments_count || 0) - 1);

          await supabase
               .from(TABLES.TENANT_POSTS)
               .update({ comments_count: newCommentsCount })
               .eq('id', comment.post_id);

          // Optionally revalidate the path where posts are displayed
          revalidatePath('/dashboard/social');

          return { success: true };
     } catch (error) {
          console.error('Error deleting comment:', error);
          return { success: false, error: 'Failed to delete comment' };
     }
}

/**
 * Get comments by current user
 */
export async function getCurrentUserComments(): Promise<ActionResponse<TenantPostComment[]>> {
     try {
          const viewer = await getViewer();
          if (!viewer.tenant) {
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          const { data, error } = await supabase
               .from(TABLES.TENANT_POST_COMMENTS)
               .select('*')
               .eq('tenant_id', viewer.tenant.id)
               .order('created_at', { ascending: false });

          if (error) {
               console.error('Error fetching user comments:', error);
               return { success: false, error: error.message };
          }

          return { success: true, data: data || [] };
     } catch (error) {
          console.error('Error fetching user comments:', error);
          return { success: false, error: 'Failed to fetch comments' };
     }
}