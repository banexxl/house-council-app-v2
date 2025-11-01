"use server";

import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { PollVote, PollVoteInsert, PollVoteUpdate } from 'src/types/poll';

const VOTES_TABLE = process.env.NEXT_PUBLIC_SUPABASE_TBL_POLL_VOTES || 'tblPollVotes';

export async function getVotesByPoll(poll_id: string): Promise<{ success: boolean; error?: string; data?: PollVote[] }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.from(VOTES_TABLE).select('*').eq('poll_id', poll_id);
     if (error) {
          await logServerAction({ action: 'getVotesByPoll', duration_ms: Date.now() - t0, error: error.message, payload: { poll_id }, status: 'fail', type: 'db', user_id: null });
          return { success: false, error: error.message };
     }
     await logServerAction({ action: 'getVotesByPoll', duration_ms: Date.now() - t0, error: '', payload: { poll_id, count: data?.length ?? 0 }, status: 'success', type: 'db', user_id: null });
     return { success: true, data: (data ?? []) as PollVote[] };
}

export async function castVote(vote: PollVoteInsert): Promise<{ success: boolean; error?: string; data?: PollVote }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.from(VOTES_TABLE).insert([vote]).select().single();
     if (error) {
          await logServerAction({ action: 'castVote', duration_ms: Date.now() - t0, error: error.message, payload: { vote }, status: 'fail', type: 'db', user_id: null });
          return { success: false, error: error.message };
     }
     await logServerAction({ action: 'castVote', duration_ms: Date.now() - t0, error: '', payload: { id: data?.id }, status: 'success', type: 'db', user_id: null });
     return { success: true, data: data as PollVote };
}

export async function updateVote(id: string, update: PollVoteUpdate): Promise<{ success: boolean; error?: string; data?: PollVote }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.from(VOTES_TABLE).update(update).eq('id', id).select().single();
     if (error) {
          await logServerAction({ action: 'updateVote', duration_ms: Date.now() - t0, error: error.message, payload: { id, update }, status: 'fail', type: 'db', user_id: null });
          return { success: false, error: error.message };
     }
     await logServerAction({ action: 'updateVote', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db', user_id: null });
     return { success: true, data: data as PollVote };
}

export async function revokeVote(id: string): Promise<{ success: boolean; error?: string }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { error } = await supabase.from(VOTES_TABLE).delete().eq('id', id);
     if (error) {
          await logServerAction({ action: 'revokeVote', duration_ms: Date.now() - t0, error: error.message, payload: { id }, status: 'fail', type: 'db', user_id: null });
          return { success: false, error: error.message };
     }
     await logServerAction({ action: 'revokeVote', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db', user_id: null });
     return { success: true };
}
