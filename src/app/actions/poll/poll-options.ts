"use server";

import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { PollOption, PollOptionInsert, PollOptionUpdate } from 'src/types/poll';

const OPTIONS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_TBL_POLL_OPTIONS || 'tblPollOptions';

export async function getPollOptions(poll_id: string): Promise<{ success: boolean; error?: string; data?: PollOption[] }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase
          .from(OPTIONS_TABLE)
          .select('*')
          .eq('poll_id', poll_id)
          .order('sort_order', { ascending: true });
     if (error) {
          await logServerAction({ action: 'getPollOptions', duration_ms: Date.now() - t0, error: error.message, payload: { poll_id }, status: 'fail', type: 'db', user_id: null });
          return { success: false, error: error.message };
     }
     await logServerAction({ action: 'getPollOptions', duration_ms: Date.now() - t0, error: '', payload: { poll_id, count: data?.length ?? 0 }, status: 'success', type: 'db', user_id: null });
     return { success: true, data: (data ?? []) as PollOption[] };
}

export async function createPollOption(option: PollOptionInsert): Promise<{ success: boolean; error?: string; data?: PollOption }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.from(OPTIONS_TABLE).insert([option]).select().single();
     if (error) {
          await logServerAction({ action: 'createPollOption', duration_ms: Date.now() - t0, error: error.message, payload: { option }, status: 'fail', type: 'db', user_id: null });
          return { success: false, error: error.message };
     }
     await logServerAction({ action: 'createPollOption', duration_ms: Date.now() - t0, error: '', payload: { id: data?.id }, status: 'success', type: 'db', user_id: null });
     return { success: true, data: data as PollOption };
}

export async function updatePollOption(id: string, update: PollOptionUpdate): Promise<{ success: boolean; error?: string; data?: PollOption }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.from(OPTIONS_TABLE).update(update).eq('id', id).select().single();
     if (error) {
          await logServerAction({ action: 'updatePollOption', duration_ms: Date.now() - t0, error: error.message, payload: { id, update }, status: 'fail', type: 'db', user_id: null });
          return { success: false, error: error.message };
     }
     await logServerAction({ action: 'updatePollOption', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db', user_id: null });
     return { success: true, data: data as PollOption };
}

export async function deletePollOption(id: string): Promise<{ success: boolean; error?: string }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { error } = await supabase.from(OPTIONS_TABLE).delete().eq('id', id);
     if (error) {
          await logServerAction({ action: 'deletePollOption', duration_ms: Date.now() - t0, error: error.message, payload: { id }, status: 'fail', type: 'db', user_id: null });
          return { success: false, error: error.message };
     }
     await logServerAction({ action: 'deletePollOption', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db', user_id: null });
     return { success: true };
}
