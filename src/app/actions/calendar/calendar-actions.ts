"use server";

import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { TABLES } from "src/libs/supabase/tables";
import { getViewer } from "src/libs/supabase/server-auth";
import type { CalendarEvent, UpdateCalendarEventInput } from "src/types/calendar";
import { logServerAction } from "src/libs/supabase/server-logging";
import { createAnnouncementNotification, createCalendarNotification } from "src/utils/notification";
import { readAllTenantsFromBuildingIds } from "../tenant/tenant-actions";
import { sendNotificationEmail } from "src/libs/email/node-mailer";
import { emitNotifications } from "../notification/emit-notification";

// Map DB row -> CalendarEvent converting timestamptz strings into epoch ms numbers
const mapRow = (r: any): CalendarEvent => ({
     id: r.id,
     all_day: r.all_day,
     description: r.description,
     end_date_time: typeof r.end_date_time === 'string' ? Date.parse(r.end_date_time) : r.end_date_time,
     start_date_time: typeof r.start_date_time === 'string' ? Date.parse(r.start_date_time) : r.start_date_time,
     title: r.title,
     client_id: r.client_id,
     calendar_event_type: (r.calendar_event_type as CalendarEvent['calendar_event_type']) || undefined,
     building_id: r.building_id ?? null,
     created_at: r.created_at
});

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export const getCalendarEvents = async (): Promise<ActionResult<CalendarEvent[]>> => {
     const time = Date.now();
     try {
          const { client, clientMember, tenant, admin } = await getViewer();
          let clientId: string | null = null;

          if (client) clientId = client.id;
          else if (clientMember) clientId = clientMember.client_id;
          // Tenants may not have client-level visibility yet; restrict to empty set
          if (tenant && !clientId) {
               await logServerAction({ user_id: null, action: 'getCalendarEvents', duration_ms: Date.now() - time, error: '', payload: { tenant: true, clientScoped: false, returned: 0 }, status: 'success', type: 'db' });
               return { success: true, data: [] };
          }

          const supabase = await useServerSideSupabaseAnonClient();
          const query = supabase.from(TABLES.CALENDAR_EVENTS).select("*");
          if (clientId && !admin) {
               query.eq("client_id", clientId);
          }
          const { data, error } = await query.order("start_date_time", { ascending: true });
          if (error) {
               await logServerAction({ user_id: null, action: 'getCalendarEvents', duration_ms: Date.now() - time, error: error.message, payload: { clientId, admin }, status: 'fail', type: 'db' });
               return { success: false, error: error.message };
          }
          const rows = (data || []).map(mapRow);
          await logServerAction({ user_id: null, action: 'getCalendarEvents', duration_ms: Date.now() - time, error: '', payload: { clientId, admin, count: rows.length }, status: 'success', type: 'db' });
          return { success: true, data: rows };
     } catch (err: any) {
          await logServerAction({ user_id: null, action: 'getCalendarEvents', duration_ms: Date.now() - time, error: err?.message || 'unexpected', payload: {}, status: 'fail', type: 'db' });
          return { success: false, error: err.message || "Unexpected error" };
     }
}

export const createCalendarEvent = async (input: CalendarEvent): Promise<ActionResult<CalendarEvent>> => {
     const time = Date.now();
     try {
          const { client, clientMember, admin } = await getViewer();
          const clientId = client?.id || clientMember?.client_id;
          if (!clientId && !admin) {
               await logServerAction({ user_id: null, action: 'createCalendarEvent', duration_ms: Date.now() - time, error: 'unauthorized', payload: { hasClient: !!clientId, admin }, status: 'fail', type: 'db' });
               return { success: false, error: "Unauthorized" };
          }

          const payload = {
               ...input,
               client_id: clientId,
               building_id: input.building_id ?? null,
               // Ensure timestamptz columns receive ISO8601 strings
               start_date_time: new Date(input.start_date_time).toISOString(),
               end_date_time: new Date(input.end_date_time).toISOString(),
          };
          const supabase = await useServerSideSupabaseAnonClient();
          const { data, error } = await supabase
               .from(TABLES.CALENDAR_EVENTS)
               .insert(payload)
               .select("*")
               .single();
          if (error || !data) {
               await logServerAction({ user_id: null, action: 'createCalendarEvent', duration_ms: Date.now() - time, error: error?.message || 'insertFailed', payload: { clientId }, status: 'fail', type: 'db' });
               return { success: false, error: error?.message || "Insert failed" };
          }
          const mapped = mapRow(data as CalendarEvent);
          // Emit notifications to tenants of the building (if building_id present)
          if (mapped.building_id) {
               try {
                    const tenantsRes = await readAllTenantsFromBuildingIds([mapped.building_id]);
                    const tenants: any[] = (tenantsRes as any)?.data || [];
                    if (tenants.length > 0) {
                         const createdAtISO = new Date().toISOString();
                         const rows = tenants.map(t => createCalendarNotification({
                              action_token: mapped.title,
                              user_id: t.user_id!,
                              description: mapped.description || '',
                              created_at: createdAtISO,
                              all_day: mapped.all_day,
                              calendar_event_type: mapped.calendar_event_type!,
                              start_date_time: mapped.start_date_time!,
                              end_date_time: mapped.end_date_time!,
                              building_id: mapped.building_id!,
                              is_read: false
                         }) as any);
                         // Send notifications
                         if (rows.length) {
                              const emitted = await emitNotifications(rows);
                              if (!emitted.success) {
                                   await logServerAction({ user_id: null, action: 'createCalendarEventNotifications', duration_ms: 0, error: emitted.error || 'emitFailed', payload: { eventId: mapped.id, count: rows.length }, status: 'fail', type: 'db' });
                              } else {
                                   await logServerAction({ user_id: null, action: 'createCalendarEventNotifications', duration_ms: 0, error: '', payload: { eventId: mapped.id, count: rows.length }, status: 'success', type: 'db' });
                              }
                         }
                    }
               } catch (e: any) {
                    await logServerAction({ user_id: null, action: 'createCalendarEventNotifications', duration_ms: 0, error: e?.message || 'unexpected', payload: { eventId: mapped.id }, status: 'fail', type: 'db' });
               }
          }
          await logServerAction({ user_id: null, action: 'createCalendarEvent', duration_ms: Date.now() - time, error: '', payload: { clientId, id: mapped.id }, status: 'success', type: 'db' });
          return { success: true, data: mapped };
     } catch (err: any) {
          await logServerAction({ user_id: null, action: 'createCalendarEvent', duration_ms: Date.now() - time, error: err?.message || 'unexpected', payload: {}, status: 'fail', type: 'db' });
          return { success: false, error: err.message || "Unexpected error" };
     }
}

export const updateCalendarEvent = async ({ eventId, update }: UpdateCalendarEventInput): Promise<ActionResult<CalendarEvent>> => {
     const time = Date.now();
     try {
          const { client, clientMember, admin } = await getViewer();
          const clientId = client?.id || clientMember?.client_id;
          // If not admin ensure event belongs to their client
          const supabase = await useServerSideSupabaseAnonClient();
          let ownershipCheck = supabase
               .from(TABLES.CALENDAR_EVENTS)
               .select('client_id')
               .eq('id', eventId)
               .limit(1)
               .single();
          const { data: ownerRow, error: ownerErr } = await ownershipCheck;
          if (ownerErr) {
               await logServerAction({ user_id: null, action: 'updateCalendarEvent', duration_ms: Date.now() - time, error: ownerErr.message, payload: { eventId, stage: 'ownership' }, status: 'fail', type: 'db' });
               return { success: false, error: ownerErr.message };
          }
          if (!admin && ownerRow?.client_id !== clientId) {
               await logServerAction({ user_id: null, action: 'updateCalendarEvent', duration_ms: Date.now() - time, error: 'forbidden', payload: { eventId, ownerClient: ownerRow?.client_id, viewerClient: clientId }, status: 'fail', type: 'db' });
               return { success: false, error: 'Forbidden' };
          }

          const normalizedUpdate: any = { ...update };
          if (normalizedUpdate.building_id === '') normalizedUpdate.building_id = null;
          if (typeof normalizedUpdate.start_date_time === 'number') {
               normalizedUpdate.start_date_time = new Date(normalizedUpdate.start_date_time).toISOString();
          }
          if (typeof normalizedUpdate.end_date_time === 'number') {
               normalizedUpdate.end_date_time = new Date(normalizedUpdate.end_date_time).toISOString();
          }
          const { data, error } = await supabase
               .from(TABLES.CALENDAR_EVENTS)
               .update(normalizedUpdate)
               .eq('id', eventId)
               .select('*')
               .single();
          if (error || !data) {
               await logServerAction({ user_id: null, action: 'updateCalendarEvent', duration_ms: Date.now() - time, error: error?.message || 'updateFailed', payload: { eventId }, status: 'fail', type: 'db' });
               return { success: false, error: error?.message || 'Update failed' };
          }
          const mapped = mapRow(data as CalendarEvent);
          // Optional: emit notifications if building_id present and start_date_time changed (reminder logic)
          try {
               if (mapped.building_id && (update.start_date_time || update.title || update.description)) {
                    const tenantsRes = await readAllTenantsFromBuildingIds([mapped.building_id]);
                    const tenants: any[] = (tenantsRes as any)?.data || [];
                    if (tenants.length > 0) {
                         const createdAtISO = new Date().toISOString();
                         const rows = tenants.map(t => createCalendarEvent({
                              title: mapped.title,
                              description: mapped.description || '',
                              created_at: createdAtISO,
                              id: mapped.id,
                              all_day: false,
                              end_date_time: mapped.end_date_time,
                              start_date_time: mapped.start_date_time,
                              client_id: mapped.client_id,
                         }) as any);
                         if (rows.length) {
                              const emitted = await emitNotifications(rows);
                              if (!emitted.success) {
                                   await logServerAction({ user_id: null, action: 'updateCalendarEventNotifications', duration_ms: 0, error: emitted.error || 'emitFailed', payload: { eventId: mapped.id, count: rows.length }, status: 'fail', type: 'db' });
                              } else {
                                   await logServerAction({ user_id: null, action: 'updateCalendarEventNotifications', duration_ms: 0, error: '', payload: { eventId: mapped.id, count: rows.length }, status: 'success', type: 'db' });
                              }
                         }
                    }
               }
          } catch (e: any) {
               await logServerAction({ user_id: null, action: 'updateCalendarEventNotifications', duration_ms: 0, error: e?.message || 'unexpected', payload: { eventId: mapped.id }, status: 'fail', type: 'db' });
          }
          await logServerAction({ user_id: null, action: 'updateCalendarEvent', duration_ms: Date.now() - time, error: '', payload: { eventId, id: mapped.id }, status: 'success', type: 'db' });
          return { success: true, data: mapped };
     } catch (err: any) {
          await logServerAction({ user_id: null, action: 'updateCalendarEvent', duration_ms: Date.now() - time, error: err?.message || 'unexpected', payload: { eventId }, status: 'fail', type: 'db' });
          return { success: false, error: err.message || 'Unexpected error' };
     }
}

export const deleteCalendarEvent = async (eventId: string): Promise<ActionResult<{ id: string }>> => {
     const time = Date.now();
     try {
          const { client, clientMember, admin } = await getViewer();
          const clientId = client?.id || clientMember?.client_id;
          const supabase = await useServerSideSupabaseAnonClient();
          const { data: ownerRow, error: ownerErr } = await supabase
               .from(TABLES.CALENDAR_EVENTS)
               .select('client_id')
               .eq('id', eventId)
               .limit(1)
               .single();
          if (ownerErr) {
               await logServerAction({ user_id: null, action: 'deleteCalendarEvent', duration_ms: Date.now() - time, error: ownerErr.message, payload: { eventId, stage: 'ownership' }, status: 'fail', type: 'db' });
               return { success: false, error: ownerErr.message };
          }
          if (!admin && ownerRow?.client_id !== clientId) {
               await logServerAction({ user_id: null, action: 'deleteCalendarEvent', duration_ms: Date.now() - time, error: 'forbidden', payload: { eventId, ownerClient: ownerRow?.client_id, viewerClient: clientId }, status: 'fail', type: 'db' });
               return { success: false, error: 'Forbidden' };
          }

          const { error } = await supabase
               .from(TABLES.CALENDAR_EVENTS)
               .delete()
               .eq('id', eventId);
          if (error) {
               await logServerAction({ user_id: null, action: 'deleteCalendarEvent', duration_ms: Date.now() - time, error: error.message, payload: { eventId }, status: 'fail', type: 'db' });
               return { success: false, error: error.message };
          }
          await logServerAction({ user_id: null, action: 'deleteCalendarEvent', duration_ms: Date.now() - time, error: '', payload: { eventId }, status: 'success', type: 'db' });
          return { success: true, data: { id: eventId } };
     } catch (err: any) {
          await logServerAction({ user_id: null, action: 'deleteCalendarEvent', duration_ms: Date.now() - time, error: err?.message || 'unexpected', payload: { eventId }, status: 'fail', type: 'db' });
          return { success: false, error: err.message || 'Unexpected error' };
     }
}

