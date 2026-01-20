'use server'

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Poll, PollStatus } from 'src/types/poll';
import { createOrUpdatePollOptions } from './poll-option-actions';
import { TABLES } from 'src/libs/supabase/tables';
import { isUUIDv4 } from 'src/utils/uuid';
import { readAllTenantsFromBuildingIds } from '../tenant/tenant-actions';
import { getBuildingAddressFromId } from '../building/building-actions';
import { getNotificationEmailsForBuildings } from '../building/building-actions';
import { createPollPublishNotification } from 'src/utils/notification';
import { BaseNotification } from 'src/types/notification';
import { emitNotifications } from '../notification/emit-notification';
import { sendViaEmail } from '../notification/senders';
import { buildPollPublishedEmail } from 'src/libs/email/messages/poll-published';
import log from 'src/utils/logger';

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

export async function getPollsFromClient(params?: { customerId?: string; building_id?: string; status?: PollStatus }): Promise<{ success: boolean; error?: string; data?: Poll[] }> {
    const t0 = Date.now();
    const supabase = await useServerSideSupabaseAnonClient();
    let query = supabase.from(TABLES.POLLS).select('*');
    if (params?.customerId) query = query.eq('customerId', params.customerId);
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

    // Delete poll options
    const { error: optionsError } = await supabase.from(TABLES.POLL_OPTIONS).delete().eq('poll_id', id);
    if (optionsError) {
        await logServerAction({ action: 'deletePoll', duration_ms: Date.now() - t0, error: optionsError.message, payload: { id }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: optionsError.message };
    }

    // Delete poll votes
    const { error: votesError } = await supabase.from(TABLES.POLL_VOTES).delete().eq('poll_id', id);
    if (votesError) {
        await logServerAction({ action: 'deletePoll', duration_ms: Date.now() - t0, error: votesError.message, payload: { id }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: votesError.message };
    }

    // Delete poll attachments
    const { error: attachmentsError } = await supabase.from(TABLES.POLL_ATTACHMENTS).delete().eq('poll_id', id);
    if (attachmentsError) {
        await logServerAction({ action: 'deletePoll', duration_ms: Date.now() - t0, error: attachmentsError.message, payload: { id }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: attachmentsError.message };
    }

    // Delete the poll itself
    const { error } = await supabase.from(TABLES.POLLS).delete().eq('id', id);
    if (error) {
        await logServerAction({ action: 'deletePoll', duration_ms: Date.now() - t0, error: error.message, payload: { id }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/polls/`);
    await logServerAction({ action: 'deletePoll', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db', user_id: null });
    return { success: true };
}

export async function closePoll(id: string, locale: string = 'rs'): Promise<{ success: boolean; error?: string; data?: Poll }> {
    return updatePollStatus(id, 'closed', locale);
}

export async function reopenPoll(id: string, locale: string = 'rs'): Promise<{ success: boolean; error?: string; data?: Poll }> {
    return updatePollStatus(id, 'active', locale);
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
    if (poll.id !== undefined && poll.id !== null && poll.id.trim() !== '' && isUUIDv4(poll.id)) {
        const pollId = poll.id;
        if (poll.options !== undefined) {
            const optRes = await createOrUpdatePollOptions(pollId, poll.options);
            if (!optRes.success) {
                await logServerAction({ action: 'createOrUpdatePoll', duration_ms: Date.now() - t0, error: optRes.error || 'options error', payload: { mode: 'update', pollId }, status: 'fail', type: 'db', user_id: null });
                return { success: false, error: optRes.error || 'Failed to update poll options' };
            }
        }

        // Exclude options from the poll object before updating
        const { id, options, attachments, votes, ...pollWithoutNonColumns } = poll as Poll;
        const { data, error } = await supabase.from(TABLES.POLLS).update(pollWithoutNonColumns).eq('id', pollId).select().single();

        if (error) {
            await logServerAction({ action: 'createOrUpdatePoll', duration_ms: Date.now() - t0, error: error.message, payload: { mode: 'update', pollId }, status: 'fail', type: 'db', user_id: null });
            return { success: false, error: error.message };
        }
        await logServerAction({ action: 'createOrUpdatePoll', duration_ms: Date.now() - t0, error: '', payload: { mode: 'update', id: data?.id }, status: 'success', type: 'db', user_id: null });
        return { success: true, data: data as Poll };
    }

    // Create path: create poll to get id, upsert options; if options fail, rollback poll
    const { id, options, attachments, votes, ...pollWithoutNonColumns } = poll as Poll;
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

/**
 * Generic function to update poll status
 */
export async function updatePollStatus(id: string, status: PollStatus, locale: string = 'rs'): Promise<{ success: boolean; error?: string; data?: Poll }> {
    const t0 = Date.now();
    const supabase = await useServerSideSupabaseAnonClient();
    // Prepare update payload based on status
    const updatePayload: Partial<Poll> = { status };

    // Add specific fields for certain status transitions
    if (status === 'closed') {
        updatePayload.closed_at = new Date().toISOString();
    } else if (status === 'active') {
        updatePayload.closed_at = null; // Clear closed_at when reopening
    }

    const { data, error } = await supabase
        .from(TABLES.POLLS)
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        await logServerAction({ action: 'updatePollStatus', duration_ms: Date.now() - t0, error: error.message, payload: { id, status }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/polls/${data?.id}`);
    // When a poll becomes active, create tenant notifications (mirrors activateScheduledPoll)
    if (status === 'active') {
        try {
            const { data: bRows, error: bErr } = await supabase
                .from(TABLES.POLLS)
                .select('building_id')
                .eq('id', id);

            if (!bErr && bRows && bRows.length > 0) {
                const buildingIds = Array.from(new Set((bRows as any[]).map(r => r.building_id).filter(Boolean)));
                if (buildingIds.length > 0) {
                    const { data: tenants } = await readAllTenantsFromBuildingIds(buildingIds);
                    log(`updatePollStatus - fetched ${tenants?.length ?? 0} tenants for buildings: ${buildingIds.join(', ')}`);
                    const { data: annRow, error: annErr } = await supabase
                        .from(TABLES.POLLS)
                        .select('title, description')
                        .eq('id', id)
                        .maybeSingle();

                    const createdAtISO = new Date().toISOString();
                    const rows = (tenants || []).map((tenant) => {
                        const notification = createPollPublishNotification({
                            action_token: 'notifications.actions.notificationActionPollPublished',
                            description: annRow?.description || '',
                            created_at: createdAtISO,
                            user_id: tenant.user_id!,
                            is_read: false,
                            poll_id: id,
                            building_id: tenant.apartment.building.id,
                            url: `/dashboard/polls/${id}`,
                            title: annRow?.title,
                        });
                        return notification as unknown as BaseNotification[];
                    }) as any[];

                    if (rows.length) {
                        const emitted = await emitNotifications(rows);
                        if (!emitted.success) {
                            await logServerAction({ user_id: null, action: '', duration_ms: 0, error: emitted.error || 'emitFailed', payload: {}, status: 'fail', type: 'db' });
                        } else {
                            await logServerAction({ user_id: null, action: 'publishPollNotifications', duration_ms: 0, error: '', payload: {}, status: 'success', type: 'db' });
                        }

                        // Additionally send email notifications to all relevant parties for these buildings
                        const emails = await getNotificationEmailsForBuildings(supabase, buildingIds as string[]);
                        log(`updatePollStatus - fetched ${emails} notification emails for buildings: ${buildingIds.join(', ')}`);
                        if (emails && emails.length > 0) {
                            const description = annRow?.description || '';

                            const addressResult = await getBuildingAddressFromId(buildingIds[0] as string);
                            const fullAddress = addressResult.success && addressResult.data ? addressResult.data : '';

                            const { subject, injectedHtml } = await buildPollPublishedEmail({
                                locale,
                                title: annRow?.title || '',
                                description,
                                fullAddress,
                            });

                            for (const email of emails) {
                                // eslint-disable-next-line no-void
                                void sendViaEmail(email, subject, injectedHtml);
                            }
                        }
                    }
                }
            }
        } catch (e: any) {
            await logServerAction({ user_id: null, action: 'publishPollNotificationsUnexpected', duration_ms: 0, error: e?.message || 'unexpected', payload: { id }, status: 'fail', type: 'db' });
        }
    }

    await logServerAction({ action: 'updatePollStatus', duration_ms: Date.now() - t0, error: '', payload: { id, status }, status: 'success', type: 'db', user_id: null });
    return { success: true, data: data as Poll };
}

/**
 * Activate a scheduled poll if its start time has arrived
 */
export async function activateAllScheduledPolls(): Promise<{ success: boolean; error?: string; data?: Poll[] }> {
    const t0 = Date.now();
    const supabase = await useServerSideSupabaseAnonClient();

    const dateTimeNow = new Date().toISOString();
    console.log('dateTimeNow', dateTimeNow);

    // First get the poll to check its status and start time
    const { data: polls, error: fetchError } = await supabase
        .from(TABLES.POLLS)
        .select('*')
        .eq('status', 'scheduled')
        .lte('starts_at', dateTimeNow)
        .order('starts_at', { ascending: true });
    console.log('activateAllScheduledPolls - fetched polls:', polls, fetchError);

    if (fetchError) {
        await logServerAction({ action: 'activateScheduledPoll', duration_ms: Date.now() - t0, error: fetchError.message, payload: { polls }, status: 'fail', type: 'db', user_id: null });
        return { success: false, error: fetchError.message };
    }

    let schedulePollsResults: Poll[] = [];

    for (const poll of polls || []) {
        if (poll.status !== 'scheduled') {
            const error = `Poll is not scheduled (current status: ${poll.status})`;
            await logServerAction({ action: 'activateScheduledPoll', duration_ms: Date.now() - t0, error, payload: { id: poll.id }, status: 'fail', type: 'db', user_id: null });
            return { success: false, error };
        }

        // Check if start time has arrived (using current time)
        const now = new Date();
        const startsAt = poll.starts_at ? new Date(poll.starts_at) : null;

        if (!startsAt || now < startsAt) {
            const error = 'Poll start time is in the future';
            await logServerAction({ action: 'activateScheduledPoll', duration_ms: Date.now() - t0, error, payload: { id: poll.id }, status: 'fail', type: 'db', user_id: null });
            return { success: false, error };
        }


        // Use the generic status update function
        const result = await updatePollStatus(poll.id, 'active');
        // Log the specific action completion
        if (result.success) {
            schedulePollsResults.push(result.data!);
            // Create notifications for tenants of targeted buildings on publish (realtime INSERT consumers pick this up)
            try {
                // 1) Resolve targeted buildings from pivot
                const { data: bRows, error: bErr } = await supabase
                    .from(TABLES.POLLS)
                    .select('building_id')
                    .eq('id', poll.id);
                if (!bErr && bRows && bRows.length > 0) {
                    const buildingIds = Array.from(new Set((bRows as any[]).map(r => r.building_id).filter(Boolean)));
                    if (buildingIds.length > 0) {
                        // 2) Get all tenant user ids for those buildings
                        const { data: tenants } = await readAllTenantsFromBuildingIds(buildingIds);
                        // 3) Fetch announcement for title/message
                        const { data: annRow, error: annErr } = await supabase.from(TABLES.POLLS).select('title, description').eq('id', poll.id).maybeSingle();
                        const createdAtISO = new Date().toISOString();
                        const rows = (tenants || []).map((tenant) => {
                            const notification = createPollPublishNotification({
                                action_token: 'notifications.actions.notificationActionPollPublished',
                                description: annRow?.description || '',
                                created_at: createdAtISO,
                                user_id: tenant.user_id!,
                                is_read: false,
                                poll_id: poll.id,
                                building_id: tenant.apartment.building.id,
                                url: `/dashboard/polls/${poll.id}`,
                                title: annRow?.title
                            });
                            return notification as unknown as BaseNotification[];
                        }) as any[];

                        if (rows.length) {
                            const emitted = await emitNotifications(rows);
                            if (!emitted.success) {
                                await logServerAction({ user_id: null, action: '', duration_ms: 0, error: emitted.error || 'emitFailed', payload: {}, status: 'fail', type: 'db' });
                            } else {
                                await logServerAction({ user_id: null, action: 'publishPollNotifications', duration_ms: 0, error: '', payload: {}, status: 'success', type: 'db' });
                            }
                        }
                    }
                }
            } catch (e: any) {
                await logServerAction({ user_id: null, action: 'publishPollNotificationsUnexpected', duration_ms: 0, error: e?.message || 'unexpected', payload: {}, status: 'fail', type: 'db' });
            }

            await logServerAction({ action: 'activateScheduledPoll', duration_ms: Date.now() - t0, error: '', payload: { id: poll.id }, status: 'success', type: 'db', user_id: null });
        } else {
            await logServerAction({ action: 'activateScheduledPoll', duration_ms: Date.now() - t0, error: result.error || 'Update failed', payload: { id: poll.id }, status: 'fail', type: 'db', user_id: null });
        }
    }

    return { success: true, data: schedulePollsResults };

}

