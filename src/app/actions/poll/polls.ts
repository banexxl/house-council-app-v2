"use server";

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Poll, PollInsert, PollStatus, PollUpdate } from 'src/types/poll';

const POLLS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_TBL_POLLS || 'tblPolls';

export async function getPolls(params?: { client_id?: string; building_id?: string; status?: PollStatus }): Promise<{ success: boolean; error?: string; data?: Poll[] }> {
    const t0 = Date.now();
    const supabase = await useServerSideSupabaseAnonClient();
    let query = supabase.from(POLLS_TABLE).select('*');
    if (params?.client_id) query = query.eq('client_id', params.client_id);
    if (params?.building_id) query = query.eq('building_id', params.building_id);
    if (params?.status) query = query.eq('status', params.status);
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
        await logServerAction({ action: 'getPolls', duration_ms: Date.now() - t0, error: error.message, payload: { params }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: error.message };
    }
    await logServerAction({ action: 'getPolls', duration_ms: Date.now() - t0, error: '', payload: { count: data?.length ?? 0, params }, status: 'success', type: 'db', user_id: null });
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

export async function createPoll(poll: PollInsert): Promise<{ success: boolean; error?: string; data?: Poll }> {
    const t0 = Date.now();
    const supabase = await useServerSideSupabaseAnonClient();
    const { data, error } = await supabase.from(POLLS_TABLE).insert([poll]).select().single();
    if (error) {
        await logServerAction({ action: 'createPoll', duration_ms: Date.now() - t0, error: error.message, payload: { poll }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: error.message };
    }
    revalidatePath(`/dashboard/polls/${data?.id}`);
    await logServerAction({ action: 'createPoll', duration_ms: Date.now() - t0, error: '', payload: { id: data?.id }, status: 'success', type: 'db', user_id: null });
    return { success: true, data: data as Poll };
}

export async function updatePoll(id: string, update: PollUpdate): Promise<{ success: boolean; error?: string; data?: Poll }> {
    const t0 = Date.now();
    const supabase = await useServerSideSupabaseAnonClient();
    const { data, error } = await supabase.from(POLLS_TABLE).update(update).eq('id', id).select().single();
    if (error) {
        await logServerAction({ action: 'updatePoll', duration_ms: Date.now() - t0, error: error.message, payload: { id, update }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: error.message };
    }
    revalidatePath(`/dashboard/polls/${data?.id}`);
    await logServerAction({ action: 'updatePoll', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db', user_id: null });
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
