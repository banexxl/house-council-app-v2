'use server'

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Poll, PollStatus } from 'src/types/poll';
import { createOrUpdatePollOptions } from './poll-options';
import { TABLES } from 'src/libs/supabase/tables';

/**
 * Reorder poll options for a poll by updating sort_order in the database.
 * @param pollId - The poll ID
 * @param optionIds - Array of option IDs in the new order
 */
export async function reorderPolls(pollId: string, optionIds: string[]): Promise<{ success: boolean; error?: string }> {
    const t0 = Date.now();
    const supabase = await useServerSideSupabaseAnonClient();

    // Fetch existing options for this poll
    const { data: existingOptions, error: fetchErr } = await supabase
        .from(TABLES.POLL_OPTIONS)
        .select('id, sort_order')
        .eq('poll_id', pollId);
    if (fetchErr) {
        await logServerAction({ action: 'reorderPolls', duration_ms: Date.now() - t0, error: fetchErr.message, payload: { pollId, optionIds }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: fetchErr.message };
    }

    const existingSet = new Set<string>((existingOptions ?? []).map((o: any) => o.id as string));
    const orderedIds = optionIds.filter((id) => existingSet.has(id));
    if (orderedIds.length !== optionIds.length) {
        await logServerAction({ action: 'reorderPolls', duration_ms: Date.now() - t0, error: 'One or more option ids not found for poll', payload: { pollId, optionIds }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: 'One or more option ids not found for this poll' };
    }

    // Two-phase update to avoid unique collisions on (poll_id, sort_order)
    const maxSort = Math.max(
        0,
        ...((existingOptions ?? []).map((o: any) => (typeof o.sort_order === 'number' ? o.sort_order : -1)))
    );
    const tempBase = maxSort + 1000;

    // Phase 1: move selected rows into a temporary, non-conflicting range
    for (let idx = 0; idx < orderedIds.length; idx++) {
        const id = orderedIds[idx];
        const { data: phase1, error } = await supabase
            .from(TABLES.POLL_OPTIONS)
            .update({ sort_order: tempBase + idx })
            .eq('id', id)
            .eq('poll_id', pollId)
            .select('id, sort_order');
        if (error) {
            await logServerAction({ action: 'reorderPolls', duration_ms: Date.now() - t0, error: error.message, payload: { pollId, optionIds }, status: 'fail', type: 'db', user_id: null });
            return { success: false, error: error.message };
        }
        if (!phase1 || phase1.length === 0) {
            await logServerAction({ action: 'reorderPolls', duration_ms: Date.now() - t0, error: 'No rows updated in phase 1', payload: { pollId, optionIds, id }, status: 'fail', type: 'db', user_id: null });
            return { success: false, error: 'No rows updated' };
        }
    }

    // Phase 2: assign final contiguous order
    for (let idx = 0; idx < orderedIds.length; idx++) {
        const id = orderedIds[idx];
        const { data: phase2, error } = await supabase
            .from(TABLES.POLL_OPTIONS)
            .update({ sort_order: idx })
            .eq('id', id)
            .eq('poll_id', pollId)
            .select('id, sort_order');
        if (error) {
            await logServerAction({ action: 'reorderPolls', duration_ms: Date.now() - t0, error: error.message, payload: { pollId, optionIds }, status: 'fail', type: 'db', user_id: null });
            return { success: false, error: error.message };
        }
        if (!phase2 || phase2.length === 0) {
            await logServerAction({ action: 'reorderPolls', duration_ms: Date.now() - t0, error: 'No rows updated in phase 2', payload: { pollId, optionIds, id }, status: 'fail', type: 'db', user_id: null });
            return { success: false, error: 'No rows updated' };
        }
    }

    revalidatePath(`/dashboard/polls/${pollId}`);
    await logServerAction({ action: 'reorderPolls', duration_ms: Date.now() - t0, error: '', payload: { pollId, optionIds }, status: 'success', type: 'db', user_id: null });
    return { success: true };
}

export async function getPollsFromClient(params?: { client_id?: string; building_id?: string; status?: PollStatus }): Promise<{ success: boolean; error?: string; data?: Poll[] }> {
    const t0 = Date.now();
    const supabase = await useServerSideSupabaseAnonClient();
    let query = supabase.from(TABLES.POLLS).select('*');
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
    // Fetch poll
    const { data, error } = await supabase.from(TABLES.POLLS).select('*').eq('id', id).single();
    if (error) {
        await logServerAction({ action: 'getPollById', duration_ms: Date.now() - t0, error: error.message, payload: { id }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: error.message };
    }
    const { data: options, error: optionsError } = await supabase.from(TABLES.POLL_OPTIONS).select('*').eq('poll_id', id).order('sort_order', { ascending: true });
    if (optionsError) {
        await logServerAction({ action: 'getPollById', duration_ms: Date.now() - t0, error: optionsError.message, payload: { id }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: optionsError.message };
    }
    // Fetch attachments for this poll
    const { data: attachments, error: attachmentsError } = await supabase
        .from(TABLES.POLL_ATTACHMENTS)
        .select('*')
        .eq('poll_id', id)
        .order('created_at', { ascending: false });
    if (attachmentsError) {
        await logServerAction({ action: 'getPollById', duration_ms: Date.now() - t0, error: attachmentsError.message, payload: { id }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: attachmentsError.message };
    }

    // Fetch poll votes and return with poll data
    const { data: votes, error: votesError } = await supabase
        .from(TABLES.POLL_VOTES)
        .select('*')
        .eq('poll_id', id)
        .order('created_at', { ascending: false });

    if (votesError) {
        await logServerAction({ action: 'getPollById', duration_ms: Date.now() - t0, error: votesError.message, payload: { id }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: votesError.message };
    }

    const pollWithOptions = { ...(data as Poll), options, attachments: attachments ?? [], votes: votes ?? [] };
    await logServerAction({ action: 'getPollById', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db', user_id: null });
    return { success: true, data: pollWithOptions };
}

export async function deletePoll(id: string): Promise<{ success: boolean; error?: string }> {
    const t0 = Date.now();
    const supabase = await useServerSideSupabaseAnonClient();
    const { error } = await supabase.from(TABLES.POLLS).delete().eq('id', id);
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
    const payload: Poll = { status: 'closed', closed_at: new Date().toISOString() } as Poll;
    const { data, error } = await supabase.from(TABLES.POLLS).update(payload).eq('id', id).select().single();
    if (error) {
        await logServerAction({ action: 'closePoll', duration_ms: Date.now() - t0, error: error.message, payload: { id }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: error.message };
    }
    revalidatePath(`/dashboard/polls/${data?.id}`);
    await logServerAction({ action: 'closePoll', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db', user_id: null });
    return { success: true, data: data as Poll };
}

export async function reopenPoll(id: string): Promise<{ success: boolean; error?: string; data?: Poll }> {
    const t0 = Date.now();
    const supabase = await useServerSideSupabaseAnonClient();
    const payload: Poll = { status: 'active', closed_at: null } as Poll;
    const { data, error } = await supabase.from(TABLES.POLLS).update(payload).eq('id', id).select().single();
    if (error) {
        await logServerAction({ action: 'reopenPoll', duration_ms: Date.now() - t0, error: error.message, payload: { id }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: error.message };
    }
    revalidatePath(`/dashboard/polls/${data?.id}`);
    await logServerAction({ action: 'reopenPoll', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db', user_id: null });
    return { success: true, data: data as Poll };
}

/**
 * Unified create/update for a poll with options orchestration.
 * - Update mode (id provided): first upsert options, then update poll.
 * - Create mode (no id): create poll to obtain id, upsert options; on failure, delete created poll and return error.
 */
export async function createOrUpdatePoll(poll: Poll): Promise<{ success: boolean; error?: string; data?: Poll }> {
    const t0 = Date.now();
    const supabase = await useServerSideSupabaseAnonClient();
    // Update path: options first, then poll update
    if (poll.id) {
        const pollId = poll.id;
        if (poll.options !== undefined) {
            const optRes = await createOrUpdatePollOptions(pollId, poll.options);
            if (!optRes.success) {
                await logServerAction({ action: 'createOrUpdatePoll', duration_ms: Date.now() - t0, error: optRes.error || 'options error', payload: { mode: 'update', pollId }, status: 'fail', type: 'db', user_id: null });
                return { success: false, error: optRes.error || 'Failed to update poll options' };
            }
        }

        // Exclude options from the poll object before updating
        const { options, attachments, votes, ...pollWithoutNonColumns } = poll as any;
        const { data, error } = await supabase.from(TABLES.POLLS).update(pollWithoutNonColumns).eq('id', pollId).select().single();
        if (error) {
            await logServerAction({ action: 'createOrUpdatePoll', duration_ms: Date.now() - t0, error: error.message, payload: { mode: 'update', pollId }, status: 'fail', type: 'db', user_id: null });
            return { success: false, error: error.message };
        }
        await logServerAction({ action: 'createOrUpdatePoll', duration_ms: Date.now() - t0, error: '', payload: { mode: 'update', id: data?.id }, status: 'success', type: 'db', user_id: null });
        return { success: true, data: data as Poll };
    }

    // Create path: create poll to get id, upsert options; if options fail, rollback poll
    const { options, attachments, votes, ...pollWithoutNonColumns } = poll as any;
    const { data: created, error: createErr } = await supabase.from(TABLES.POLLS).insert([pollWithoutNonColumns]).select().single();
    if (createErr || !created) {
        await logServerAction({ action: 'createOrUpdatePoll', duration_ms: Date.now() - t0, error: createErr?.message || 'create error', payload: { mode: 'create' }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: createErr?.message || 'Failed to create poll' };
    }

    const pollId = created.id as string;
    if (options !== undefined) {
        const optRes = await createOrUpdatePollOptions(pollId, options);
        if (!optRes.success) {
            // Roll back the created poll so we don't leave orphaned rows
            await supabase.from(TABLES.POLLS).delete().eq('id', pollId);
            await logServerAction({ action: 'createOrUpdatePoll', duration_ms: Date.now() - t0, error: optRes.error || 'options error', payload: { mode: 'create', pollId }, status: 'fail', type: 'db', user_id: null });
            return { success: false, error: optRes.error || 'Failed to create poll options' };
        }
    }

    await logServerAction({ action: 'createOrUpdatePoll', duration_ms: Date.now() - t0, error: '', payload: { mode: 'create', id: pollId }, status: 'success', type: 'db', user_id: null });
    return { success: true, data: created as Poll };
}

