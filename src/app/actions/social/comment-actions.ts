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
import type { EmojiReaction } from 'src/types/social';
import { emitNotifications } from 'src/app/actions/notification/emit-notification';
import { NOTIFICATION_TYPES_MAP, type Notification, NOTIFICATION_ACTION_TOKENS } from 'src/types/notification';
import { url } from 'inspector';

type ActionResponse<T> = {
     success: boolean;
     data?: T;
     error?: string;
};

type ReactionResult = {
     reactions: EmojiReaction[];
     userReaction: string | null;
};

const socialType = NOTIFICATION_TYPES_MAP.find((t) => t.value === 'social')!;

function aggregateCommentReactions(rows: Array<{ comment_id: string; emoji: string; tenant_id: string }>, currentUserId: string | null) {
     const reactionMap = new Map<string, EmojiReaction[]>();
     const userReactionMap = new Map<string, string>();

     for (const row of rows) {
          const list = reactionMap.get(row.comment_id) ?? [];
          const existing = list.find((r) => r.emoji === row.emoji);
          if (existing) {
               existing.count += 1;
               existing.userReacted = existing.userReacted || row.tenant_id === currentUserId;
          } else {
               list.push({
                    emoji: row.emoji,
                    count: 1,
                    userReacted: row.tenant_id === currentUserId,
               });
          }
          reactionMap.set(row.comment_id, list);

          if (row.tenant_id === currentUserId) {
               userReactionMap.set(row.comment_id, row.emoji);
          }
     }

     return { reactionMap, userReactionMap };
}

/**
 * Get comments for a post
 */
export async function getPostComments(postId: string): Promise<ActionResponse<TenantPostCommentWithAuthor[]>> {
     try {
          const supabase = await useServerSideSupabaseAnonClient();
          const viewer = await getViewer();
          const currentUserId = viewer.tenant?.id || null;

          const { data, error } = await supabase
               .from(TABLES.TENANT_POST_COMMENTS)
               .select(`
                    *,
                    author:profile_id (
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

          const comments = data || [];
          const commentIds = comments.map((c: any) => c.id).filter(Boolean);
          let reactionMap = new Map<string, EmojiReaction[]>();
          let userReactionMap = new Map<string, string>();

          if (commentIds.length) {
               const { data: reactionRows, error: reactionError } = await supabase
                    .from(TABLES.TENANT_COMMENT_LIKES)
                    .select('comment_id, emoji, tenant_id')
                    .in('comment_id', commentIds);

               if (reactionError) {
                    console.error('Error loading comment reactions:', reactionError);
               } else {
                    const aggregates = aggregateCommentReactions(reactionRows || [], currentUserId);
                    reactionMap = aggregates.reactionMap;
                    userReactionMap = aggregates.userReactionMap;
               }
          }

          const commentsWithAuthor = comments.map((comment: any) => ({
               ...comment,
               author: comment.author ?? {
                    id: comment.tenant_id,
                    first_name: comment.author?.first_name ?? 'Unknown',
                    last_name: comment.author?.last_name ?? 'User',
                    avatar_url: comment.author?.avatar_url ?? null,
               },
               reactions: reactionMap.get(comment.id) ?? [],
               userReaction: userReactionMap.get(comment.id) ?? null,
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

          // Fetch tenant profile id to satisfy non-null constraint on profile_id
          const { data: profileRow, error: profileError } = await supabase
               .from(TABLES.TENANT_PROFILES)
               .select('id')
               .eq('tenant_id', viewer.tenant.id)
               .maybeSingle();

          if (profileError) {
               console.error('Error loading tenant profile for comment:', profileError);
               return { success: false, error: 'Failed to load tenant profile' };
          }

          if (!profileRow?.id) {
               return { success: false, error: 'Tenant profile not found. Please create your profile first.' };
          }

          // Create the comment
          const { data, error } = await supabase
               .from(TABLES.TENANT_POST_COMMENTS)
               .insert({
                    tenant_id: viewer.tenant.id,
                    profile_id: profileRow.id,
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

          // Notify participants on the post (post owner + prior commenters), excluding the commenter
          try {
               const participantTenantIds = new Set<string>();

               const { data: postRow } = await supabase
                    .from(TABLES.TENANT_POSTS)
                    .select('tenant_id')
                    .eq('id', payload.post_id)
                    .maybeSingle();

               if (postRow?.tenant_id) {
                    participantTenantIds.add(postRow.tenant_id);
               }

               const { data: priorComments } = await supabase
                    .from(TABLES.TENANT_POST_COMMENTS)
                    .select('tenant_id')
                    .eq('post_id', payload.post_id);

               for (const row of priorComments || []) {
                    const tid = (row as any).tenant_id;
                    if (tid) participantTenantIds.add(tid);
               }

               participantTenantIds.delete(viewer.tenant.id);

               let targetUserIds: string[] = [];
               if (participantTenantIds.size > 0) {
                    const { data: tenantsWithUsers } = await supabase
                         .from(TABLES.TENANTS)
                         .select('id, user_id')
                         .in('id', Array.from(participantTenantIds));
                    targetUserIds = (tenantsWithUsers || [])
                         .map((row: any) => row.user_id as string | null)
                         .filter((uid): uid is string => Boolean(uid));
               }

               const commentToken = NOTIFICATION_ACTION_TOKENS.find((t) => t.key === 'commentCreated')?.translationToken;
               const notifications: Notification[] = targetUserIds.map((uid) => ({
                    type: socialType,
                    description: payload.comment_text,
                    created_at: new Date().toISOString(),
                    user_id: uid,
                    is_read: false,
                    related_post_id: payload.post_id,
                    related_comment_id: data.id,
                    action_token: commentToken,
                    url: `/dashboard/social/feed/${payload.post_id}#comment-${data.id}`,
               } as any));

               if (notifications.length) {
                    await emitNotifications(notifications);
               }
          } catch (notifyError) {
               console.error('Failed to emit comment notification:', notifyError);
          }

          // Optionally revalidate the path where posts are displayed
          revalidatePath('/dashboard/social/feed');
          revalidatePath('/dashboard/social/profile');

          return { success: true, data };
     } catch (error) {
          console.error('Error creating comment:', error);
          return { success: false, error: 'Failed to create comment' };
     }
}

/**
 * React to a comment with a specific emoji
 */
export async function reactToComment(commentId: string, emoji: string): Promise<ActionResponse<ReactionResult>> {
     try {
          const viewer = await getViewer();
          if (!viewer.tenant) {
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();
          const tenantId = viewer.tenant.id;

          const { data: existingReaction, error: existingError } = await supabase
               .from(TABLES.TENANT_COMMENT_LIKES)
               .select('id, emoji')
               .eq('comment_id', commentId)
               .eq('tenant_id', tenantId)
               .maybeSingle();

          if (existingError && existingError.code !== 'PGRST116') {
               console.error('Error loading existing comment reaction:', existingError);
               return { success: false, error: existingError.message };
          }

          if (existingReaction?.emoji === emoji) {
               const { error: deleteError } = await supabase
                    .from(TABLES.TENANT_COMMENT_LIKES)
                    .delete()
                    .eq('id', existingReaction.id);

               if (deleteError) {
                    console.error('Error removing comment reaction:', deleteError);
                    return { success: false, error: deleteError.message };
               }
          } else if (existingReaction) {
               const { error: updateError } = await supabase
                    .from(TABLES.TENANT_COMMENT_LIKES)
                    .update({ emoji })
                    .eq('id', existingReaction.id);

               if (updateError) {
                    console.error('Error updating comment reaction:', updateError);
                    return { success: false, error: updateError.message };
               }
          } else {
               const { error: insertError } = await supabase
                    .from(TABLES.TENANT_COMMENT_LIKES)
                    .insert({
                         comment_id: commentId,
                         tenant_id: tenantId,
                         emoji,
                    });

               if (insertError) {
                    console.error('Error adding comment reaction:', insertError);
                    return { success: false, error: insertError.message };
               }
          }

          const { data: rows, error: rowsError } = await supabase
               .from(TABLES.TENANT_COMMENT_LIKES)
               .select('comment_id, emoji, tenant_id')
               .eq('comment_id', commentId);

          if (rowsError) {
               console.error('Error fetching comment reactions:', rowsError);
               return { success: false, error: rowsError.message };
          }

          const { reactionMap, userReactionMap } = aggregateCommentReactions(rows || [], tenantId);
          const reactions = reactionMap.get(commentId) ?? [];
          const userReaction = userReactionMap.get(commentId) ?? null;

          revalidatePath('/dashboard/social/feed');
          revalidatePath('/dashboard/social');

          return { success: true, data: { reactions, userReaction } };
     } catch (error) {
          console.error('Error reacting to comment:', error);
          return { success: false, error: 'Failed to react to comment' };
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
