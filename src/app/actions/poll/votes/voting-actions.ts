"use server";

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { getViewer } from 'src/libs/supabase/server-auth';
import { TABLES } from 'src/libs/supabase/tables';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Poll, PollVote, VoteStatus, PollType } from 'src/types/poll';
import { Tenant } from 'src/types/tenant';

/**
 * Get active and scheduled polls for buildings where the current tenant has apartments
 */
export async function getTenantBuildingPolls(): Promise<{
     success: boolean;
     data?: Poll[];
     error?: string;
     tenant?: Tenant;
}> {
     const start = Date.now();

     try {
          // Get current user
          const viewer = await getViewer();

          if (!viewer.tenant) {
               await logServerAction({
                    user_id: viewer.userData?.id || null,
                    action: 'Get Tenant Building Polls - No tenant data',
                    payload: {},
                    status: 'fail',
                    error: 'User is not a tenant',
                    duration_ms: Date.now() - start,
                    type: 'action'
               });

               return {
                    success: false,
                    error: 'User is not a tenant'
               };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Get tenant's apartment to find building
          const { data: tenant, error: tenantError } = await supabase
               .from(TABLES.TENANTS)
               .select(`
        *,
        apartment:apartment_id (
          id,
          building_id,
          apartment_number
        )
      `)
               .eq('user_id', viewer.userData!.id)
               .single();

          if (tenantError || !tenant) {
               await logServerAction({
                    user_id: viewer.userData?.id || null,
                    action: 'Get Tenant Building Polls - Tenant lookup failed',
                    payload: { user_id: viewer.userData?.id },
                    status: 'fail',
                    error: tenantError?.message || 'Tenant not found',
                    duration_ms: Date.now() - start,
                    type: 'action'
               });

               return {
                    success: false,
                    error: 'Tenant not found'
               };
          }

          if (!tenant.apartment?.building_id) {
               return {
                    success: true,
                    data: [],
                    tenant: tenant as Tenant
               };
          }

          // Get active and scheduled polls for the building
          const { data: polls, error: pollsError } = await supabase
               .from(TABLES.POLLS)
               .select(`
        *,
        options:tblPollOptions (
          id,
          poll_id,
          label,
          sort_order
        )
      `)
               .eq('building_id', tenant.apartment.building_id)
               .in('status', ['active', 'scheduled'])
               .order('created_at', { ascending: false });

          if (pollsError) {
               await logServerAction({
                    user_id: viewer.userData?.id || null,
                    action: 'Get Tenant Building Polls - Polls lookup failed',
                    payload: { building_id: tenant.apartment.building_id },
                    status: 'fail',
                    error: pollsError.message,
                    duration_ms: Date.now() - start,
                    type: 'action'
               });

               return {
                    success: false,
                    error: 'Failed to fetch polls'
               };
          }

          await logServerAction({
               user_id: viewer.userData?.id || null,
               action: 'Get Tenant Building Polls - Success',
               payload: {
                    building_id: tenant.apartment.building_id,
                    polls_count: polls?.length || 0
               },
               status: 'success',
               error: '',
               duration_ms: Date.now() - start,
               type: 'action'
          });

          return {
               success: true,
               data: polls || [],
               tenant: tenant as Tenant
          };

     } catch (error) {
          await logServerAction({
               user_id: null,
               action: 'Get Tenant Building Polls - Exception',
               payload: {},
               status: 'fail',
               error: error instanceof Error ? error.message : 'Unknown error',
               duration_ms: Date.now() - start,
               type: 'action'
          });

          return {
               success: false,
               error: 'Failed to fetch tenant building polls'
          };
     }
}

/**
 * Submit a vote for a poll
 */
export async function submitVote(data: {
     poll_id: string;
     vote_data: {
          choice_bool?: boolean | null;
          choice_option_ids?: string[] | null;
          ranks?: { option_id: string; rank: number }[] | null;
          scores?: { option_id: string; score: number }[] | null;
     };
     abstain?: boolean;
     is_anonymous?: boolean;
     comment?: string | null;
}): Promise<{
     success: boolean;
     error?: string;
     vote?: PollVote;
}> {
     const start = Date.now();

     try {
          // Get current user
          const viewer = await getViewer();

          if (!viewer.tenant) {
               await logServerAction({
                    user_id: viewer.userData?.id || null,
                    action: 'Submit Vote - No tenant data',
                    payload: { poll_id: data.poll_id },
                    status: 'fail',
                    error: 'User is not a tenant',
                    duration_ms: Date.now() - start,
                    type: 'action'
               });

               return {
                    success: false,
                    error: 'User is not a tenant'
               };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Get tenant details
          const { data: tenant, error: tenantError } = await supabase
               .from(TABLES.TENANTS)
               .select('id, apartment_id')
               .eq('user_id', viewer.userData!.id)
               .single();

          if (tenantError || !tenant) {
               await logServerAction({
                    user_id: viewer.userData?.id || null,
                    action: 'Submit Vote - Tenant lookup failed',
                    payload: { poll_id: data.poll_id },
                    status: 'fail',
                    error: tenantError?.message || 'Tenant not found',
                    duration_ms: Date.now() - start,
                    type: 'action'
               });

               return {
                    success: false,
                    error: 'Tenant not found'
               };
          }

          // Check if poll exists and is active
          const { data: poll, error: pollError } = await supabase
               .from(TABLES.POLLS)
               .select('id, status, type, ends_at, allow_change_until_deadline')
               .eq('id', data.poll_id)
               .single();

          if (pollError || !poll) {
               await logServerAction({
                    user_id: viewer.userData?.id || null,
                    action: 'Submit Vote - Poll lookup failed',
                    payload: { poll_id: data.poll_id },
                    status: 'fail',
                    error: pollError?.message || 'Poll not found',
                    duration_ms: Date.now() - start,
                    type: 'action'
               });

               return {
                    success: false,
                    error: 'Poll not found'
               };
          }

          if (poll.status !== 'active') {
               return {
                    success: false,
                    error: 'Poll is not active'
               };
          }

          // Check if poll has ended
          if (poll.ends_at && new Date() > new Date(poll.ends_at)) {
               return {
                    success: false,
                    error: 'Poll has ended'
               };
          }

          // Check if tenant has already voted
          const { data: existingVote, error: existingVoteError } = await supabase
               .from(TABLES.POLL_VOTES)
               .select('id, status')
               .eq('poll_id', data.poll_id)
               .eq('tenant_id', tenant.id)
               .single();

          if (existingVoteError && existingVoteError.code !== 'PGRST116') {
               await logServerAction({
                    user_id: viewer.userData?.id || null,
                    action: 'Submit Vote - Existing vote lookup failed',
                    payload: { poll_id: data.poll_id, tenant_id: tenant.id },
                    status: 'fail',
                    error: existingVoteError.message,
                    duration_ms: Date.now() - start,
                    type: 'action'
               });

               return {
                    success: false,
                    error: 'Failed to check existing vote'
               };
          }

          // If there's an existing vote and changes are not allowed, prevent new vote
          if (existingVote && existingVote.status === 'cast' && !poll.allow_change_until_deadline) {
               return {
                    success: false,
                    error: 'You have already voted and changes are not allowed'
               };
          }

          // Prepare vote data
          const voteData = {
               poll_id: data.poll_id,
               tenant_id: tenant.id,
               apartment_id: tenant.apartment_id,
               status: 'cast' as VoteStatus,
               cast_at: new Date().toISOString(),
               abstain: data.abstain || false,
               is_anonymous: data.is_anonymous || false,
               comment: data.comment || null,
               choice_bool: data.vote_data.choice_bool || null,
               choice_option_ids: data.vote_data.choice_option_ids || null,
               ranks: data.vote_data.ranks || null,
               scores: data.vote_data.scores || null,
          };

          let result;

          if (existingVote) {
               // Update existing vote
               const { data: updatedVote, error: updateError } = await supabase
                    .from(TABLES.POLL_VOTES)
                    .update(voteData)
                    .eq('id', existingVote.id)
                    .select()
                    .single();

               if (updateError) {
                    await logServerAction({
                         user_id: viewer.userData?.id || null,
                         action: 'Submit Vote - Update failed',
                         payload: { poll_id: data.poll_id, tenant_id: tenant.id },
                         status: 'fail',
                         error: updateError.message,
                         duration_ms: Date.now() - start,
                         type: 'action'
                    });

                    return {
                         success: false,
                         error: 'Failed to update vote'
                    };
               }

               result = updatedVote;
          } else {
               // Insert new vote
               const { data: newVote, error: insertError } = await supabase
                    .from(TABLES.POLL_VOTES)
                    .insert(voteData)
                    .select()
                    .single();

               if (insertError) {
                    await logServerAction({
                         user_id: viewer.userData?.id || null,
                         action: 'Submit Vote - Insert failed',
                         payload: { poll_id: data.poll_id, tenant_id: tenant.id },
                         status: 'fail',
                         error: insertError.message,
                         duration_ms: Date.now() - start,
                         type: 'action'
                    });

                    return {
                         success: false,
                         error: 'Failed to submit vote'
                    };
               }

               result = newVote;
          }

          await logServerAction({
               user_id: viewer.userData?.id || null,
               action: 'Submit Vote - Success',
               payload: {
                    poll_id: data.poll_id,
                    tenant_id: tenant.id,
                    vote_type: poll.type,
                    is_update: !!existingVote
               },
               status: 'success',
               error: '',
               duration_ms: Date.now() - start,
               type: 'action'
          });

          // Revalidate the voting page
          revalidatePath('/dashboard/polls/voting');

          return {
               success: true,
               vote: result as PollVote
          };

     } catch (error) {
          await logServerAction({
               user_id: null,
               action: 'Submit Vote - Exception',
               payload: { poll_id: data.poll_id },
               status: 'fail',
               error: error instanceof Error ? error.message : 'Unknown error',
               duration_ms: Date.now() - start,
               type: 'action'
          });

          return {
               success: false,
               error: 'Failed to submit vote'
          };
     }
}

/**
 * Get tenant's vote for a specific poll
 */
export async function getTenantVote(poll_id: string): Promise<{
     success: boolean;
     data?: PollVote;
     error?: string;
}> {
     const start = Date.now();

     try {
          // Get current user
          const viewer = await getViewer();

          if (!viewer.tenant) {
               return {
                    success: false,
                    error: 'User is not a tenant'
               };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Get tenant ID
          const { data: tenant, error: tenantError } = await supabase
               .from(TABLES.TENANTS)
               .select('id')
               .eq('user_id', viewer.userData!.id)
               .single();

          if (tenantError || !tenant) {
               return {
                    success: false,
                    error: 'Tenant not found'
               };
          }

          // Get tenant's vote for this poll
          const { data: vote, error: voteError } = await supabase
               .from(TABLES.POLL_VOTES)
               .select('*')
               .eq('poll_id', poll_id)
               .eq('tenant_id', tenant.id)
               .single();
          console.log('poll votes error', voteError);

          if (voteError && voteError.code !== 'PGRST116') {
               await logServerAction({
                    user_id: viewer.userData?.id || null,
                    action: 'Get Tenant Vote - Lookup failed',
                    payload: { poll_id, tenant_id: tenant.id },
                    status: 'fail',
                    error: voteError.message,
                    duration_ms: Date.now() - start,
                    type: 'action'
               });

               return {
                    success: false,
                    error: 'Failed to fetch vote'
               };
          }

          return {
               success: true,
               data: vote || undefined
          };

     } catch (error) {
          await logServerAction({
               user_id: null,
               action: 'Get Tenant Vote - Exception',
               payload: { poll_id },
               status: 'fail',
               error: error instanceof Error ? error.message : 'Unknown error',
               duration_ms: Date.now() - start,
               type: 'action'
          });

          return {
               success: false,
               error: 'Failed to fetch tenant vote'
          };
     }
}

/**
 * Revoke a tenant's vote for a specific poll
 */
export async function revokeTenantVote(poll_id: string): Promise<{
     success: boolean;
     error?: string;
}> {
     const start = Date.now();

     try {
          // Get current user
          const viewer = await getViewer();

          if (!viewer.tenant) {
               return {
                    success: false,
                    error: 'User is not a tenant'
               };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Get tenant ID
          const { data: tenant, error: tenantError } = await supabase
               .from(TABLES.TENANTS)
               .select('id')
               .eq('user_id', viewer.userData!.id)
               .single();

          if (tenantError || !tenant) {
               return {
                    success: false,
                    error: 'Tenant not found'
               };
          }

          // Check if poll allows changes
          const { data: poll, error: pollError } = await supabase
               .from(TABLES.POLLS)
               .select('allow_change_until_deadline, status, ends_at')
               .eq('id', poll_id)
               .single();

          if (pollError || !poll) {
               return {
                    success: false,
                    error: 'Poll not found'
               };
          }

          if (poll.status !== 'active') {
               return {
                    success: false,
                    error: 'Poll is not active'
               };
          }

          if (!poll.allow_change_until_deadline) {
               return {
                    success: false,
                    error: 'Vote changes are not allowed for this poll'
               };
          }

          // Check if poll has ended
          if (poll.ends_at && new Date() > new Date(poll.ends_at)) {
               return {
                    success: false,
                    error: 'Poll has ended'
               };
          }

          // Update vote status to revoked
          const { error: updateError } = await supabase
               .from(TABLES.POLL_VOTES)
               .update({
                    status: 'revoked' as VoteStatus,
                    cast_at: new Date().toISOString()
               })
               .eq('poll_id', poll_id)
               .eq('tenant_id', tenant.id);

          if (updateError) {
               await logServerAction({
                    user_id: viewer.userData?.id || null,
                    action: 'Revoke Tenant Vote - Update failed',
                    payload: { poll_id, tenant_id: tenant.id },
                    status: 'fail',
                    error: updateError.message,
                    duration_ms: Date.now() - start,
                    type: 'action'
               });

               return {
                    success: false,
                    error: 'Failed to revoke vote'
               };
          }

          await logServerAction({
               user_id: viewer.userData?.id || null,
               action: 'Revoke Tenant Vote - Success',
               payload: { poll_id, tenant_id: tenant.id },
               status: 'success',
               error: '',
               duration_ms: Date.now() - start,
               type: 'action'
          });

          // Revalidate the voting page
          revalidatePath('/dashboard/polls/voting');

          return {
               success: true
          };

     } catch (error) {
          await logServerAction({
               user_id: null,
               action: 'Revoke Tenant Vote - Exception',
               payload: { poll_id },
               status: 'fail',
               error: error instanceof Error ? error.message : 'Unknown error',
               duration_ms: Date.now() - start,
               type: 'action'
          });

          return {
               success: false,
               error: 'Failed to revoke vote'
          };
     }
}
