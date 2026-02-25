"use server";

import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { TABLES } from "src/libs/supabase/tables";
import { getViewer } from "src/libs/supabase/server-auth";
import type { CalendarEvent, UpdateCalendarEventInput } from "src/types/calendar";
import { logServerAction } from "src/libs/supabase/server-logging";
import { createCalendarNotification } from "src/utils/notification";
import { readAllTenantsFromBuildingIds } from "../tenant/tenant-actions";
import { emitNotifications } from "../notification/emit-notification";
import { getBuildingAddressFromId, getNotificationEmailsForBuildings } from "../building/building-actions";
import { buildCalendarEventCreatedEmail } from "src/libs/email/messages/calendar-event-created";
import log from "src/utils/logger";
import { sendViaEmail } from "../notification/senders";
import { revalidatePath } from "next/cache";

// Map DB row -> CalendarEvent preserving timestamptz as ISO strings
const mapRow = (r: any): CalendarEvent => ({
     id: r.id,
     all_day: r.all_day,
     description: r.description,
     end_date_time:
          typeof r.end_date_time === 'number'
               ? new Date(r.end_date_time).toISOString()
               : r.end_date_time instanceof Date
                    ? r.end_date_time.toISOString()
                    : r.end_date_time,
     start_date_time:
          typeof r.start_date_time === 'number'
               ? new Date(r.start_date_time).toISOString()
               : r.start_date_time instanceof Date
                    ? r.start_date_time.toISOString()
                    : r.start_date_time,
     title: r.title,
     customerId: r.customerId,
     calendar_event_type: (r.calendar_event_type as CalendarEvent['calendar_event_type']) || undefined,
     building_id: r.building_id ?? null,
     created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
     timezone: r.timezone,
});

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export const getCalendarEvents = async (): Promise<ActionResult<CalendarEvent[]>> => {
     const time = Date.now();
     try {
          const { customer, tenant, admin } = await getViewer();
          let customerId: string | null = null;

          if (customer) customerId = customer.id;
          // Tenants may not have client-level visibility yet; restrict to empty set
          if (tenant && !customerId && !admin) {
               await logServerAction({ user_id: null, action: 'getCalendarEvents', duration_ms: Date.now() - time, error: '', payload: { tenant: true, clientScoped: false, returned: 0 }, status: 'success', type: 'db' });
               return { success: true, data: [] };
          }

          const supabase = await useServerSideSupabaseAnonClient();
          const query = supabase.from(TABLES.CALENDAR_EVENTS).select("*");
          if (customerId && !admin) {
               query.eq("customerId", customerId);
          }
          const { data, error } = await query.order("start_date_time", { ascending: true });
          if (error) {
               await logServerAction({ user_id: null, action: 'getCalendarEvents', duration_ms: Date.now() - time, error: error.message, payload: { customerId, admin }, status: 'fail', type: 'db' });
               return { success: false, error: error.message };
          }
          const rows = (data || []).map(mapRow);
          await logServerAction({ user_id: null, action: 'getCalendarEvents', duration_ms: Date.now() - time, error: '', payload: { customerId, admin, count: rows.length }, status: 'success', type: 'db' });
          return { success: true, data: rows };
     } catch (err: any) {
          await logServerAction({ user_id: null, action: 'getCalendarEvents', duration_ms: Date.now() - time, error: err?.message || 'unexpected', payload: {}, status: 'fail', type: 'db' });
          return { success: false, error: err.message || "Unexpected error" };
     }
}

export const listDashboardEvents = async ({
     upcomingLimit = 5,
     pastLimit = 5,
     upcomingDaysWindow = 10,
     buildingIds,
}: { upcomingLimit?: number; pastLimit?: number; upcomingDaysWindow?: number; buildingIds?: string[] } = {}): Promise<ActionResult<{
     upcoming: CalendarEvent[];
     past: CalendarEvent[];
}>> => {
     const time = Date.now();
     try {
          const { customer, tenant, admin } = await getViewer();
          const customerId = customer?.id || null;
          const scopedBuildingIds = (buildingIds || []).filter(Boolean);
          const hasBuildingScope = scopedBuildingIds.length > 0;

          if (tenant && !customerId && !admin && !hasBuildingScope) {
               await logServerAction({ user_id: null, action: 'listDashboardEvents', duration_ms: Date.now() - time, error: '', payload: { tenant: true, clientScoped: false, returned: 0 }, status: 'success', type: 'db' });
               return { success: true, data: { upcoming: [], past: [] } };
          }

          const now = new Date();
          const nowIso = now.toISOString();
          const windowEnd = new Date(now.getTime() + upcomingDaysWindow * 24 * 60 * 60 * 1000).toISOString();

          const supabase = await useServerSideSupabaseAnonClient();
          const applyScope = (query: any) => {
               if (hasBuildingScope) return query.in('building_id', scopedBuildingIds);
               if (customerId && !admin) return query.eq('customerId', customerId);
               return query;
          };
          const upcomingQuery = applyScope(supabase.from(TABLES.CALENDAR_EVENTS).select('*'));
          const upcomingPromise = upcomingQuery
               .gte('start_date_time', nowIso)
               .lte('start_date_time', windowEnd)
               .order('start_date_time', { ascending: true })
               .limit(upcomingLimit);

          const pastQuery = applyScope(supabase.from(TABLES.CALENDAR_EVENTS).select('*'));
          const pastPromise = pastQuery
               .lt('start_date_time', nowIso)
               .order('start_date_time', { ascending: false })
               .limit(pastLimit);

          const [{ data: upcomingData, error: upcomingError }, { data: pastData, error: pastError }] = await Promise.all([
               upcomingPromise,
               pastPromise,
          ]);

          if (upcomingError || pastError) {
               const errMsg = upcomingError?.message || pastError?.message || 'query failed';
               await logServerAction({
                    user_id: null,
                    action: 'listDashboardEvents',
                    duration_ms: Date.now() - time,
                    error: errMsg,
                    payload: { customerId, admin, buildingIds: scopedBuildingIds.length },
                    status: 'fail',
                    type: 'db',
               });
               return { success: false, error: errMsg };
          }

          const upcoming = (upcomingData || []).map(mapRow);
          const past = (pastData || []).map(mapRow);

          await logServerAction({
               user_id: null,
               action: 'listDashboardEvents',
               duration_ms: Date.now() - time,
               error: '',
               payload: { customerId, admin, buildingIds: scopedBuildingIds.length, upcoming: upcoming.length, past: past.length },
               status: 'success',
               type: 'db',
          });

          return { success: true, data: { upcoming, past } };
     } catch (err: any) {
          await logServerAction({ user_id: null, action: 'listDashboardEvents', duration_ms: Date.now() - time, error: err?.message || 'unexpected', payload: {}, status: 'fail', type: 'db' });
          return { success: false, error: err.message || "Unexpected error" };
     }
};

export const createCalendarEvent = async (input: CalendarEvent, locale: string = "rs"): Promise<ActionResult<CalendarEvent>> => {
     const time = Date.now();
     try {
          const { customer, admin } = await getViewer();
          const customerId = customer?.id || null;
          if (!customerId && !admin) {
               await logServerAction({ user_id: null, action: 'createCalendarEvent', duration_ms: Date.now() - time, error: 'unauthorized', payload: { hasCustomer: !!customerId, admin }, status: 'fail', type: 'db' });
               return { success: false, error: "Unauthorized" };
          }

          const payload = {
               ...input,
               customerId: customerId,
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
               await logServerAction({ user_id: null, action: 'createCalendarEvent', duration_ms: Date.now() - time, error: error?.message || 'insertFailed', payload: { customerId }, status: 'fail', type: 'db' });
               return { success: false, error: error?.message || "Insert failed" };
          }
          revalidatePath('/dashboard/calendar');
          const mapped = mapRow(data as CalendarEvent);
          // Emit notifications to tenants of the building (if building_id present)
          if (mapped.building_id) {
               try {
                    const tenantsRes = await readAllTenantsFromBuildingIds([mapped.building_id]);
                    const tenants: any[] = (tenantsRes as any)?.data || [];
                    if (tenants.length > 0) {
                         const createdAtISO = new Date().toISOString();
                         const rows = tenants.map(t => createCalendarNotification({
                              action_token: 'notifications.actions.notificationActionCalendarEventPublished',
                              user_id: t.user_id!,
                              description: mapped.description || '',
                              created_at: createdAtISO,
                              all_day: mapped.all_day,
                              calendar_event_type: mapped.calendar_event_type!,
                              start_date_time: mapped.start_date_time!,
                              end_date_time: mapped.end_date_time!,
                              building_id: mapped.building_id!,
                              is_read: false,
                              url: `/dashboard/calendar/`,
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

               // Additionally send email notifications (calendar-event-created template)
               try {
                    const supabase = await useServerSideSupabaseAnonClient();
                    const emails = await getNotificationEmailsForBuildings(supabase, [mapped.building_id]);

                    if (emails && emails.length > 0) {
                         const addressResult = await getBuildingAddressFromId(mapped.building_id);
                         const fullAddress = addressResult.success && addressResult.data ? addressResult.data : '';

                         const { subject, injectedHtml } = await buildCalendarEventCreatedEmail({
                              locale,
                              eventId: mapped.id,
                              title: mapped.title,
                              description: mapped.description || '',
                              fullAddress,
                         });

                         for (const email of emails) {
                              const { ok, error } = await sendViaEmail(email, subject, injectedHtml);
                              if (!ok) {
                                   log(`Error sending calendar event email to ${email} for event ID ${mapped.id}: ${error}`);
                              }
                         }
                    }
               } catch (e: any) {
                    log(`Unexpected error sending calendar event emails for event ID ${mapped.id}: ${e?.message || e}`);
               }
          }

          await logServerAction({ user_id: null, action: 'createCalendarEvent', duration_ms: Date.now() - time, error: '', payload: { customerId, id: mapped.id }, status: 'success', type: 'db' });
          return { success: true, data: mapped };
     } catch (err: any) {
          await logServerAction({ user_id: null, action: 'createCalendarEvent', duration_ms: Date.now() - time, error: err?.message || 'unexpected', payload: {}, status: 'fail', type: 'db' });
          return { success: false, error: err.message || "Unexpected error" };
     }
}

export const updateCalendarEvent = async ({ eventId, update }: UpdateCalendarEventInput): Promise<ActionResult<CalendarEvent>> => {
     const time = Date.now();
     try {
          const { customer, admin } = await getViewer();
          const customerId = customer?.id || null;
          // If not admin ensure event belongs to their client
          const supabase = await useServerSideSupabaseAnonClient();
          let ownershipCheck = supabase
               .from(TABLES.CALENDAR_EVENTS)
               .select('customerId')
               .eq('id', eventId)
               .limit(1)
               .single();
          const { data: ownerRow, error: ownerErr } = await ownershipCheck;
          if (ownerErr) {
               await logServerAction({ user_id: null, action: 'updateCalendarEvent', duration_ms: Date.now() - time, error: ownerErr.message, payload: { eventId, stage: 'ownership' }, status: 'fail', type: 'db' });
               return { success: false, error: ownerErr.message };
          }
          if (!admin && ownerRow?.customerId !== customerId) {
               await logServerAction({ user_id: null, action: 'updateCalendarEvent', duration_ms: Date.now() - time, error: 'forbidden', payload: { eventId, ownerClient: ownerRow?.customerId, viewerClient: customerId }, status: 'fail', type: 'db' });
               return { success: false, error: 'Forbidden' };
          }

          const normalizedUpdate: any = { ...update };
          if (normalizedUpdate.building_id === '') normalizedUpdate.building_id = null;
          const toISO = (value: any) => {
               if (typeof value === 'number') return new Date(value).toISOString();
               if (typeof value === 'string' && /^\d+$/.test(value)) return new Date(Number(value)).toISOString();
               if (value instanceof Date) return value.toISOString();
               return value;
          };
          normalizedUpdate.start_date_time = toISO(normalizedUpdate.start_date_time);
          normalizedUpdate.end_date_time = toISO(normalizedUpdate.end_date_time);
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
          revalidatePath('/dashboard/calendar');
          const mapped = mapRow(data as CalendarEvent);
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
          const { customer, admin } = await getViewer();
          const customerId = customer?.id || null;
          const supabase = await useServerSideSupabaseAnonClient();
          const { data: ownerRow, error: ownerErr } = await supabase
               .from(TABLES.CALENDAR_EVENTS)
               .select('customerId')
               .eq('id', eventId)
               .limit(1)
               .single();
          if (ownerErr) {
               await logServerAction({ user_id: null, action: 'deleteCalendarEvent', duration_ms: Date.now() - time, error: ownerErr.message, payload: { eventId, stage: 'ownership' }, status: 'fail', type: 'db' });
               return { success: false, error: ownerErr.message };
          }
          if (!admin && ownerRow?.customerId !== customerId) {
               await logServerAction({ user_id: null, action: 'deleteCalendarEvent', duration_ms: Date.now() - time, error: 'forbidden', payload: { eventId, ownerClient: ownerRow?.customerId, viewerClient: customerId }, status: 'fail', type: 'db' });
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
          revalidatePath('/dashboard/calendar');
          await logServerAction({ user_id: null, action: 'deleteCalendarEvent', duration_ms: Date.now() - time, error: '', payload: { eventId }, status: 'success', type: 'db' });
          return { success: true, data: { id: eventId } };
     } catch (err: any) {
          await logServerAction({ user_id: null, action: 'deleteCalendarEvent', duration_ms: Date.now() - time, error: err?.message || 'unexpected', payload: { eventId }, status: 'fail', type: 'db' });
          return { success: false, error: err.message || 'Unexpected error' };
     }
}

export const getCalendarEventsByBuildingId = async (buildingId: string): Promise<ActionResult<CalendarEvent[]>> => {
     const time = Date.now();
     try {
          const supabase = await useServerSideSupabaseAnonClient();
          const { data, error } = await supabase.from(TABLES.CALENDAR_EVENTS).select("*").eq("building_id", buildingId).order("start_date_time", { ascending: true });
          if (error) {
               await logServerAction({ user_id: null, action: 'getCalendarEventsByBuildingId', duration_ms: Date.now() - time, error: error.message, payload: { buildingId }, status: 'fail', type: 'db' });
               return { success: false, error: error.message };
          }
          const rows = (data || []).map(mapRow);
          await logServerAction({ user_id: null, action: 'getCalendarEventsByBuildingId', duration_ms: Date.now() - time, error: '', payload: { buildingId, count: rows.length }, status: 'success', type: 'db' });
          return { success: true, data: rows };
     } catch (err: any) {
          await logServerAction({ user_id: null, action: 'getCalendarEventsByBuildingId', duration_ms: Date.now() - time, error: err?.message || 'unexpected', payload: { buildingId }, status: 'fail', type: 'db' });
          return { success: false, error: err.message || "Unexpected error" };
     }
}

