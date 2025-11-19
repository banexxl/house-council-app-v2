'use server';

import { revalidatePath } from 'next/cache';
import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { getViewer } from 'src/libs/supabase/server-auth';
import type {
     TenantPostLike,
     EmojiReaction
} from 'src/types/social';
import { computeReactionAggregates } from 'src/utils/social-reactions';

type ActionResponse<T> = {
     success: boolean;
     data?: T;
     error?: string;
};

type ReactionResult = {
     reactions: EmojiReaction[];
     userReaction: string | null;
};

/**
 * React to a post with a specific emoji (selecting same emoji twice removes the reaction).
 */
export async function reactToPost(postId: string, emoji: string): Promise<ActionResponse<ReactionResult>> {
     try {
          const viewer = await getViewer();
          if (!viewer.tenant) {
               return { success: false, error: 'User not authenticated or not a tenant' };
          }

          const supabase = await useServerSideSupabaseAnonClient();
          const tenantId = viewer.tenant.id;

          const { data: existingReaction, error: existingError } = await supabase
               .from(TABLES.TENANT_POST_LIKES)
               .select('id, emoji')
               .eq('post_id', postId)
               .eq('tenant_id', tenantId)
               .maybeSingle();

          if (existingError && existingError.code !== 'PGRST116') {
               console.error('Error loading existing reaction:', existingError);
               return { success: false, error: existingError.message };
          }

          if (existingReaction?.emoji === emoji) {
               const { error: deleteError } = await supabase
                    .from(TABLES.TENANT_POST_LIKES)
                    .delete()
                    .eq('id', existingReaction.id);

               if (deleteError) {
                    console.error('Error removing reaction:', deleteError);
                    return { success: false, error: deleteError.message };
               }
          } else if (existingReaction) {
               const { error: updateError } = await supabase
                    .from(TABLES.TENANT_POST_LIKES)
                    .update({ emoji })
                    .eq('id', existingReaction.id);

               if (updateError) {
                    console.error('Error updating reaction:', updateError);
                    return { success: false, error: updateError.message };
               }
          } else {
               const { error: insertError } = await supabase
                    .from(TABLES.TENANT_POST_LIKES)
                    .insert({
                         post_id: postId,
                         tenant_id: tenantId,
                         emoji,
                    });

               if (insertError) {
                    console.error('Error adding reaction:', insertError);
                    return { success: false, error: insertError.message };
               }
          }

          const { data: rows, error: rowsError } = await supabase
               .from(TABLES.TENANT_POST_LIKES)
               .select('post_id, emoji, tenant_id')
               .eq('post_id', postId);

          if (rowsError) {
               console.error('Error fetching reactions:', rowsError);
               return { success: false, error: rowsError.message };
          }

          const { reactionMap, userReactionMap } = computeReactionAggregates(rows, tenantId);
          const reactions = reactionMap.get(postId) ?? [];
          const userReaction = userReactionMap.get(postId) ?? null;

          revalidatePath('/dashboard/social/feed');
          revalidatePath('/dashboard/social');

          return { success: true, data: { reactions, userReaction } };
     } catch (error) {
          console.error('Error reacting to post:', error);
          return { success: false, error: 'Failed to react to post' };
     }
}

/**
 * Get likes for a post (legacy consumers).
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
 * Check if current user reacted to a post.
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

          if (error && error.code !== 'PGRST116') {
               console.error('Error checking user reaction:', error);
               return { success: false, error: error.message };
          }

          return { success: true, data: !!data };
     } catch (error) {
          console.error('Error checking user reaction:', error);
          return { success: false, error: 'Failed to check reaction status' };
     }
}
