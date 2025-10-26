"use server";

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Poll, PollInsert, PollStatus, PollUpdate } from 'src/types/poll';
import { createOrUpdatePollOptions } from './poll-options';
import log from 'src/utils/logger';

const POLLS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_TBL_POLLS || 'tblPolls';

export async function getPollsFromClient(params?: { client_id?: string; building_id?: string; status?: PollStatus }): Promise<{ success: boolean; error?: string; data?: Poll[] }> {
    const t0 = Date.now();
    const supabase = await useServerSideSupabaseAnonClient();
    let query = supabase.from(POLLS_TABLE).select('*');
    if (params?.client_id) query = query.eq('client_id', params.client_id);
    if (params?.building_id) query = query.eq('building_id', params.building_id);
    if (params?.status) query = query.eq('status', params.status);
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
        await logServerAction({ action: 'getPollsFromClient', duration_ms: Date.now() - t0, error: error.message, payload: { params }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: error.message };
    }
    await logServerAction({ action: 'getPollsFromClient', duration_ms: Date.now() - t0, error: '', payload: { count: data?.length ?? 0, params }, status: 'success', type: 'db', user_id: null });
    return { success: true, data: (data ?? []) as Poll[] };
}

export async function getPollById(id: string): Promise<{ success: boolean; error?: string; data?: Poll }> {
    const t0 = Date.now();
    const supabase = await useServerSideSupabaseAnonClient();
    const { data, error } = await supabase.from(POLLS_TABLE).select('*').eq('id', id).single();
    if (error) {
        await logServerAction({ action: 'getPollById', duration_ms: Date.now() - t0, error: error.message, payload: { id }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: error.message };
    }
    await logServerAction({ action: 'getPollById', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db', user_id: null });
    return { success: true, data: data as Poll };
}

export async function deletePoll(id: string): Promise<{ success: boolean; error?: string }> {
    const t0 = Date.now();
    const supabase = await useServerSideSupabaseAnonClient();
    const { error } = await supabase.from(POLLS_TABLE).delete().eq('id', id);
    if (error) {
        await logServerAction({ action: 'deletePoll', duration_ms: Date.now() - t0, error: error.message, payload: { id }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: error.message };
    }
    revalidatePath(`/dashboard/polls/`);
    await logServerAction({ action: 'deletePoll', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db', user_id: null });
    return { success: true };
}

export async function closePoll(id: string): Promise<{ success: boolean; error?: string; data?: Poll }> {
    const t0 = Date.now();
    const supabase = await useServerSideSupabaseAnonClient();
    const payload: PollUpdate = { status: 'closed', closed_at: new Date().toISOString() } as PollUpdate;
    const { data, error } = await supabase.from(POLLS_TABLE).update(payload).eq('id', id).select().single();
    if (error) {
        await logServerAction({ action: 'closePoll', duration_ms: Date.now() - t0, error: error.message, payload: { id }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: error.message };
    }
    revalidatePath(`/dashboard/polls/${data?.id}`);
    await logServerAction({ action: 'closePoll', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db', user_id: null });
    return { success: true, data: data as Poll };
}

/**
 * Unified create/update for a poll with options orchestration.
 * - Update mode (id provided): first upsert options, then update poll.
 * - Create mode (no id): create poll to obtain id, upsert options; on failure, delete created poll and return error.
 */
export async function createOrUpdatePoll(params: {
    id?: string;
    data: PollInsert | PollUpdate;
    options?: { id?: string; label: string; sort_order: number }[];
}): Promise<{ success: boolean; error?: string; data?: Poll }> {
    const t0 = Date.now();
    const supabase = await useServerSideSupabaseAnonClient();

    // Update path: options first, then poll update
    if (params.id) {
        const pollId = params.id;
        if (params.options !== undefined) {
            const optRes = await createOrUpdatePollOptions(pollId, params.options);
            if (!optRes.success) {
                await logServerAction({ action: 'createOrUpdatePoll', duration_ms: Date.now() - t0, error: optRes.error || 'options error', payload: { mode: 'update', pollId }, status: 'fail', type: 'db', user_id: null });
                return { success: false, error: optRes.error || 'Failed to update poll options' };
            }
        }

        const { data, error } = await supabase.from(POLLS_TABLE).update(params.data as PollUpdate).eq('id', pollId).select().single();
        if (error) {
            await logServerAction({ action: 'createOrUpdatePoll', duration_ms: Date.now() - t0, error: error.message, payload: { mode: 'update', pollId }, status: 'fail', type: 'db', user_id: null });
            return { success: false, error: error.message };
        }
        revalidatePath(`/dashboard/polls/${data?.id}`);
        await logServerAction({ action: 'createOrUpdatePoll', duration_ms: Date.now() - t0, error: '', payload: { mode: 'update', id: data?.id }, status: 'success', type: 'db', user_id: null });
        return { success: true, data: data as Poll };
    }

    // Create path: create poll to get id, upsert options; if options fail, rollback poll
    const { data: created, error: createErr } = await supabase.from(POLLS_TABLE).insert([params.data as PollInsert]).select().single();
    if (createErr || !created) {
        await logServerAction({ action: 'createOrUpdatePoll', duration_ms: Date.now() - t0, error: createErr?.message || 'create error', payload: { mode: 'create' }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: createErr?.message || 'Failed to create poll' };
    }

    const pollId = created.id as string;
    if (params.options !== undefined) {
        const optRes = await createOrUpdatePollOptions(pollId, params.options);
        if (!optRes.success) {
            // Roll back the created poll so we don't leave orphaned rows
            await supabase.from(POLLS_TABLE).delete().eq('id', pollId);
            await logServerAction({ action: 'createOrUpdatePoll', duration_ms: Date.now() - t0, error: optRes.error || 'options error', payload: { mode: 'create', pollId }, status: 'fail', type: 'db', user_id: null });
            return { success: false, error: optRes.error || 'Failed to create poll options' };
        }
    }

    revalidatePath(`/dashboard/polls/${pollId}`);
    await logServerAction({ action: 'createOrUpdatePoll', duration_ms: Date.now() - t0, error: '', payload: { mode: 'create', id: pollId }, status: 'success', type: 'db', user_id: null });
    return { success: true, data: created as Poll };
}
