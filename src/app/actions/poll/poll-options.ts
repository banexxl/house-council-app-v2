"use server";

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { PollOption, PollOptionInsert, PollOptionUpdate } from 'src/types/poll';

const OPTIONS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_TBL_POLL_OPTIONS!

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

/**
 * Creates, updates, and deletes poll options to match the provided desired state for a given poll.
 * - For existing options (by id), updates only if label or sort_order changed
 * - Creates new options where id is missing
 * - Deletes any existing options that are not present in the desired list
 */
export async function createOrUpdatePollOptions(
     poll_id: string,
     desired: PollOption[]
): Promise<{ success: boolean; error?: string; created?: number; updated?: number; deleted?: number }> {
     const t0 = Date.now();
     const existingRes = await getPollOptions(poll_id);
     if (!existingRes.success) {
          await logServerAction({ action: 'createOrUpdatePollOptions', duration_ms: Date.now() - t0, error: existingRes.error || 'read error', payload: { poll_id }, status: 'fail', type: 'db', user_id: null });
          return { success: false, error: existingRes.error || 'Failed to read existing options' };
     }
     const existing = new Map((existingRes.data || []).map((o) => [o.id, o]));
     const keepIds = new Set<string>();

     let created = 0;
     let updated = 0;
     let deleted = 0;

     // Upsert and track desired
     for (const [i, r] of desired.entries()) {
          const nextOrder = typeof r.sort_order === 'number' ? r.sort_order : i;
          if (r.id && existing.has(r.id)) {
               keepIds.add(r.id);
               const prev = existing.get(r.id)!;
               if (prev.label !== r.label || prev.sort_order !== nextOrder) {
                    const res = await updatePollOption(r.id, { label: r.label, sort_order: nextOrder });
                    if (!res.success) {
                         await logServerAction({ action: 'createOrUpdatePollOptions', duration_ms: Date.now() - t0, error: res.error || 'update error', payload: { poll_id, id: r.id }, status: 'fail', type: 'db', user_id: null });
                         return { success: false, error: res.error || 'Failed to update poll option' };
                    }
                    updated += 1;
               }
          } else {
               const res = await createPollOption({ poll_id, label: r.label, sort_order: nextOrder } as PollOptionInsert);
               if (!res.success) {
                    await logServerAction({ action: 'createOrUpdatePollOptions', duration_ms: Date.now() - t0, error: res.error || 'create error', payload: { poll_id }, status: 'fail', type: 'db', user_id: null });
                    return { success: false, error: res.error || 'Failed to create poll option' };
               }
               revalidatePath(`/dashboard/polls/${poll_id}`);
               created += 1;
          }
     }

     // Delete missing
     for (const [id] of existing) {
          if (!keepIds.has(id)) {
               const res = await deletePollOption(id);
               if (!res.success) {
                    await logServerAction({ action: 'createOrUpdatePollOptions', duration_ms: Date.now() - t0, error: res.error || 'delete error', payload: { poll_id, id }, status: 'fail', type: 'db', user_id: null });
                    return { success: false, error: res.error || 'Failed to delete poll option' };
               }
               deleted += 1;
          }
     }

     await logServerAction({ action: 'createOrUpdatePollOptions', duration_ms: Date.now() - t0, error: '', payload: { poll_id, created, updated, deleted }, status: 'success', type: 'db', user_id: null });
     return { success: true, created, updated, deleted };
}
