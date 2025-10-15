"use server";

import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { TABLES } from "src/libs/supabase/tables";
import { getViewer } from "src/libs/supabase/server-auth";
import type { CalendarEvent, UpdateCalendarEventInput } from "src/types/calendar";
import log from "src/utils/logger";

// Map DB row -> CalendarEvent (keeps field names consistent across app)
const mapRow = (r: CalendarEvent): CalendarEvent => ({
     id: r.id,
     all_day: r.all_day,
     description: r.description,
     end_date_time: r.end_date_time,
     start_date_time: r.start_date_time,
     title: r.title,
     client_id: r.client_id,
     calendar_event_type: (r.calendar_event_type as CalendarEvent['calendar_event_type']) || undefined,
});

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export const getCalendarEvents = async (): Promise<ActionResult<CalendarEvent[]>> => {
     try {
          const { client, clientMember, tenant, admin } = await getViewer();
          let clientId: string | null = null;

          if (client) clientId = client.id;
          else if (clientMember) clientId = clientMember.client_id;
          // Tenants may not have client-level visibility yet; restrict to empty set
          if (tenant && !clientId) return { success: true, data: [] };

          const supabase = await useServerSideSupabaseAnonClient();
          const query = supabase.from(TABLES.CALENDAR_EVENTS).select("*");
          if (clientId && !admin) {
               query.eq("client_id", clientId);
          }
          const { data, error } = await query.order("start_date_time", { ascending: true });
          if (error) return { success: false, error: error.message };
          return { success: true, data: (data || []).map(mapRow) };
     } catch (err: any) {
          return { success: false, error: err.message || "Unexpected error" };
     }
}

export const createCalendarEvent = async (input: CalendarEvent): Promise<ActionResult<CalendarEvent>> => {
     try {
          const { client, clientMember, admin } = await getViewer();
          const clientId = client?.id || clientMember?.client_id;
          if (!clientId && !admin) return { success: false, error: "Unauthorized" };

          const payload = { ...input, client_id: clientId };
          const supabase = await useServerSideSupabaseAnonClient();
          const { data, error } = await supabase
               .from(TABLES.CALENDAR_EVENTS)
               .insert(payload)
               .select("*")
               .single();
          log(`Creating calendar event with payload: ${JSON.stringify(payload)}`);
          log(`data: ${JSON.stringify(data)}`);
          log(`error: ${error?.message ?? ""}`);
          if (error || !data) return { success: false, error: error?.message || "Insert failed" };
          return { success: true, data: mapRow(data as CalendarEvent) };
     } catch (err: any) {
          return { success: false, error: err.message || "Unexpected error" };
     }
}

export const updateCalendarEvent = async ({ eventId, update }: UpdateCalendarEventInput): Promise<ActionResult<CalendarEvent>> => {
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
          if (ownerErr) return { success: false, error: ownerErr.message };
          if (!admin && ownerRow?.client_id !== clientId) return { success: false, error: 'Forbidden' };

          const { data, error } = await supabase
               .from(TABLES.CALENDAR_EVENTS)
               .update(update)
               .eq('id', eventId)
               .select('*')
               .single();
          if (error || !data) return { success: false, error: error?.message || 'Update failed' };
          return { success: true, data: mapRow(data as CalendarEvent) };
     } catch (err: any) {
          return { success: false, error: err.message || 'Unexpected error' };
     }
}

export const deleteCalendarEvent = async (eventId: string): Promise<ActionResult<{ id: string }>> => {
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
          if (ownerErr) return { success: false, error: ownerErr.message };
          if (!admin && ownerRow?.client_id !== clientId) return { success: false, error: 'Forbidden' };

          const { error } = await supabase
               .from(TABLES.CALENDAR_EVENTS)
               .delete()
               .eq('id', eventId);
          if (error) return { success: false, error: error.message };
          return { success: true, data: { id: eventId } };
     } catch (err: any) {
          return { success: false, error: err.message || 'Unexpected error' };
     }
}

