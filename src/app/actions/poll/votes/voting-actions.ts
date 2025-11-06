"use server";

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { getViewer } from 'src/libs/supabase/server-auth';
import { TABLES } from 'src/libs/supabase/tables';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Poll, PollVote, VoteStatus, PollType, PollOption } from 'src/types/poll';
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

/**
 * Get closed polls for buildings where the current tenant has apartments
 */
export async function getTenantClosedPolls(): Promise<{
     success: boolean;
     data?: Poll[];
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
               return {
                    success: false,
                    error: 'Tenant not found'
               };
          }

          if (!tenant.apartment?.building_id) {
               return {
                    success: true,
                    data: []
               };
          }

          // Get closed polls for the building
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
               .eq('status', 'closed')
               .order('closed_at', { ascending: false });

          if (pollsError) {
               await logServerAction({
                    user_id: viewer.userData?.id || null,
                    action: 'Get Tenant Closed Polls - Polls lookup failed',
                    payload: { building_id: tenant.apartment.building_id },
                    status: 'fail',
                    error: pollsError.message,
                    duration_ms: Date.now() - start,
                    type: 'action'
               });

               return {
                    success: false,
                    error: 'Failed to fetch closed polls'
               };
          }

          await logServerAction({
               user_id: viewer.userData?.id || null,
               action: 'Get Tenant Closed Polls - Success',
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
               data: polls || []
          };

     } catch (error) {
          await logServerAction({
               user_id: null,
               action: 'Get Tenant Closed Polls - Exception',
               payload: {},
               status: 'fail',
               error: error instanceof Error ? error.message : 'Unknown error',
               duration_ms: Date.now() - start,
               type: 'action'
          });

          return {
               success: false,
               error: 'Failed to fetch tenant closed polls'
          };
     }
}

/**
 * Get comprehensive poll results with vote statistics
 */
export async function getPollResults(poll_id: string): Promise<{
     success: boolean;
     data?: {
          poll: Poll;
          votes: PollVote[];
          statistics: {
               total_votes: number;
               total_eligible: number;
               participation_rate: number;
               abstentions: number;
               anonymous_votes: number;
               results_by_option?: { option_id: string; option_label: string; count: number; percentage: number }[];
               yes_no_results?: { yes: number; no: number; yes_percentage: number; no_percentage: number };
               ranking_results?: { option_id: string; option_label: string; average_rank: number; total_points: number }[];
               score_results?: { option_id: string; option_label: string; average_score: number; total_score: number; vote_count: number }[];
          };
     };
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

          // Get poll with options
          const { data: poll, error: pollError } = await supabase
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
               .eq('id', poll_id)
               .single();

          if (pollError || !poll) {
               return {
                    success: false,
                    error: 'Poll not found'
               };
          }

          // Get all votes for this poll
          const { data: votes, error: votesError } = await supabase
               .from(TABLES.POLL_VOTES)
               .select('*')
               .eq('poll_id', poll_id)
               .eq('status', 'cast');

          if (votesError) {
               await logServerAction({
                    user_id: viewer.userData?.id || null,
                    action: 'Get Poll Results - Votes lookup failed',
                    payload: { poll_id },
                    status: 'fail',
                    error: votesError.message,
                    duration_ms: Date.now() - start,
                    type: 'action'
               });

               return {
                    success: false,
                    error: 'Failed to fetch poll results'
               };
          }

          // Get total eligible voters (tenants in the building)
          const { data: tenant, error: tenantError } = await supabase
               .from(TABLES.TENANTS)
               .select('apartment_id')
               .eq('user_id', viewer.userData!.id)
               .single();

          if (tenantError || !tenant) {
               return {
                    success: false,
                    error: 'Tenant not found'
               };
          }

          const { data: apartment, error: apartmentError } = await supabase
               .from(TABLES.APARTMENTS)
               .select('building_id')
               .eq('id', tenant.apartment_id)
               .single();

          if (apartmentError || !apartment) {
               return {
                    success: false,
                    error: 'Apartment not found'
               };
          }

          // Count total eligible voters in the building
          const { data: buildingApartments, error: buildingApartmentsError } = await supabase
               .from(TABLES.APARTMENTS)
               .select('id')
               .eq('building_id', apartment.building_id);

          if (buildingApartmentsError) {
               return {
                    success: false,
                    error: 'Failed to get building apartments'
               };
          }

          const apartmentIds = buildingApartments.map(apt => apt.id);

          const { data: eligibleVoters, error: eligibleVotersError } = await supabase
               .from(TABLES.TENANTS)
               .select('id')
               .in('apartment_id', apartmentIds);

          if (eligibleVotersError) {
               return {
                    success: false,
                    error: 'Failed to get eligible voters'
               };
          }

          // Calculate basic statistics
          const totalVotes = votes?.length || 0;
          const totalEligible = eligibleVoters?.length || 0;
          const participationRate = totalEligible > 0 ? (totalVotes / totalEligible) * 100 : 0;
          const abstentions = votes?.filter(vote => vote.abstain).length || 0;
          const anonymousVotes = votes?.filter(vote => vote.is_anonymous).length || 0;

          let statistics: any = {
               total_votes: totalVotes,
               total_eligible: totalEligible,
               participation_rate: Math.round(participationRate * 100) / 100,
               abstentions,
               anonymous_votes: anonymousVotes
          };

          // Calculate results based on poll type
          const validVotes = votes?.filter(vote => !vote.abstain) || [];

          switch (poll.type) {
               case 'yes_no':
                    const yesVotes = validVotes.filter(vote => vote.choice_bool === true).length;
                    const noVotes = validVotes.filter(vote => vote.choice_bool === false).length;
                    const totalValidVotes = yesVotes + noVotes;

                    statistics.yes_no_results = {
                         yes: yesVotes,
                         no: noVotes,
                         yes_percentage: totalValidVotes > 0 ? Math.round((yesVotes / totalValidVotes) * 10000) / 100 : 0,
                         no_percentage: totalValidVotes > 0 ? Math.round((noVotes / totalValidVotes) * 10000) / 100 : 0
                    };
                    break;

               case 'single_choice':
               case 'multiple_choice':
                    const optionCounts: Record<string, number> = {};
                    poll.options.forEach((option: PollOption) => {
                         optionCounts[option.id] = 0;
                    });

                    validVotes.forEach(vote => {
                         if (vote.choice_option_ids) {
                              vote.choice_option_ids.forEach((optionId: string) => {
                                   if (optionCounts[optionId] !== undefined) {
                                        optionCounts[optionId]++;
                                   }
                              });
                         }
                    });

                    const totalOptionVotes = Object.values(optionCounts).reduce((sum, count) => sum + count, 0);

                    statistics.results_by_option = poll.options.map((option: PollOption) => ({
                         option_id: option.id,
                         option_label: option.label,
                         count: optionCounts[option.id],
                         percentage: totalOptionVotes > 0 ? Math.round((optionCounts[option.id] / totalOptionVotes) * 10000) / 100 : 0
                    }));
                    break;

               case 'ranked_choice':
                    const rankingData: Record<string, { total_points: number; vote_count: number }> = {};
                    poll.options.forEach((option: PollOption) => {
                         rankingData[option.id] = { total_points: 0, vote_count: 0 };
                    });

                    validVotes.forEach(vote => {
                         if (vote.ranks) {
                              vote.ranks.forEach((rank: any) => {
                                   if (rankingData[rank.option_id]) {
                                        // Lower rank number = higher preference = more points
                                        const points = poll.options.length - rank.rank + 1;
                                        rankingData[rank.option_id].total_points += points;
                                        rankingData[rank.option_id].vote_count++;
                                   }
                              });
                         }
                    });

                    statistics.ranking_results = poll.options.map((option: PollOption) => ({
                         option_id: option.id,
                         option_label: option.label,
                         total_points: rankingData[option.id].total_points,
                         average_rank: rankingData[option.id].vote_count > 0
                              ? Math.round((rankingData[option.id].total_points / rankingData[option.id].vote_count) * 100) / 100
                              : 0
                    })).sort((a: any, b: any) => b.total_points - a.total_points);
                    break;

               case 'score':
                    const scoreData: Record<string, { total_score: number; vote_count: number }> = {};
                    poll.options.forEach((option: PollOption) => {
                         scoreData[option.id] = { total_score: 0, vote_count: 0 };
                    });

                    validVotes.forEach(vote => {
                         if (vote.scores) {
                              vote.scores.forEach((score: any) => {
                                   if (scoreData[score.option_id]) {
                                        scoreData[score.option_id].total_score += score.score;
                                        scoreData[score.option_id].vote_count++;
                                   }
                              });
                         }
                    });

                    statistics.score_results = poll.options.map((option: PollOption) => ({
                         option_id: option.id,
                         option_label: option.label,
                         total_score: scoreData[option.id].total_score,
                         vote_count: scoreData[option.id].vote_count,
                         average_score: scoreData[option.id].vote_count > 0
                              ? Math.round((scoreData[option.id].total_score / scoreData[option.id].vote_count) * 100) / 100
                              : 0
                    })).sort((a: any, b: any) => b.average_score - a.average_score);
                    break;
          }

          await logServerAction({
               user_id: viewer.userData?.id || null,
               action: 'Get Poll Results - Success',
               payload: { poll_id, total_votes: totalVotes },
               status: 'success',
               error: '',
               duration_ms: Date.now() - start,
               type: 'action'
          });

          return {
               success: true,
               data: {
                    poll: poll as Poll,
                    votes: votes as PollVote[],
                    statistics
               }
          };

     } catch (error) {
          await logServerAction({
               user_id: null,
               action: 'Get Poll Results - Exception',
               payload: { poll_id },
               status: 'fail',
               error: error instanceof Error ? error.message : 'Unknown error',
               duration_ms: Date.now() - start,
               type: 'action'
          });

          return {
               success: false,
               error: 'Failed to fetch poll results'
          };
     }
}
