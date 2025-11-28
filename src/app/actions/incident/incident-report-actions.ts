'use server';

import { revalidatePath } from 'next/cache';
import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import type { IncidentReport, IncidentStatus } from 'src/types/incident-report';
import log from 'src/utils/logger';

const REVALIDATE_PATHS = ['/dashboard/service-requests', '/dashboard/service-requests/create'];

const revalidateIncidents = () => {
  REVALIDATE_PATHS.forEach((path) => revalidatePath(path));
};

export const createIncidentReport = async (
  payload: Omit<IncidentReport, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: IncidentReport; error?: string }> => {
  const started = Date.now();
  const supabase = await useServerSideSupabaseAnonClient();

  const { data, error } = await supabase
    .from(TABLES.INCIDENT_REPORTS!)
    .insert(payload)
    .select()
    .single();

  if (error) {
    log(`Error creating incident report with payload: ${JSON.stringify(payload)}: ${error.message}`);
    await logServerAction({
      user_id: null,
      action: 'incident.create',
      duration_ms: Date.now() - started,
      error: error.message,
      payload,
      status: 'fail',
      type: 'db',
    });
    return { success: false, error: error.message };
  }

  await logServerAction({
    user_id: null,
    action: 'incident.create',
    duration_ms: Date.now() - started,
    error: '',
    payload,
    status: 'success',
    type: 'db',
  });

  revalidateIncidents();
  return { success: true, data };
};

export const getIncidentReportById = async (
  id: string
): Promise<{ success: boolean; data?: IncidentReport; error?: string }> => {
  const supabase = await useServerSideSupabaseAnonClient();
  const { data, error } = await supabase.from(TABLES.INCIDENT_REPORTS!).select('*').eq('id', id).single();
  if (error) {
    log(`Error getting incident report by id with payload: ${JSON.stringify({ id })}: ${error.message}`);
    await logServerAction({
      user_id: null,
      action: 'incident.getById',
      duration_ms: 0,
      error: error.message,
      payload: { id },
      status: 'fail',
      type: 'db',
    });
    return { success: false, error: error.message };
  }
  return { success: true, data };
};

export const listIncidentReports = async (filters?: {
  clientId?: string;
  buildingId?: string;
  status?: IncidentStatus;
}): Promise<{ success: boolean; data?: IncidentReport[]; error?: string }> => {
  if (!TABLES.INCIDENT_REPORTS) {
    const payload = { filters };
    log(`Error listing incident reports with payload: ${JSON.stringify(payload)}: Incident reports table name is not configured`);
    await logServerAction({
      user_id: null,
      action: 'incident.list',
      duration_ms: 0,
      error: 'Incident reports table name is not configured',
      payload,
      status: 'fail',
      type: 'db',
    });
    return { success: false, error: 'Incident reports table name is not configured' };
  }

  const supabase = await useServerSideSupabaseAnonClient();
  let query = supabase.from(TABLES.INCIDENT_REPORTS).select('*').order('created_at', { ascending: false });

  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId);
  }
  if (filters?.buildingId) {
    query = query.eq('building_id', filters.buildingId);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) {
    log(`Error listing incident reports with payload: ${JSON.stringify(filters)}: ${error.message}`);
    await logServerAction({
      user_id: null,
      action: 'incident.list',
      duration_ms: 0,
      error: error.message,
      payload: filters,
      status: 'fail',
      type: 'db',
    });
    return { success: false, error: error.message };
  }
  return { success: true, data: data ?? [] };
};

export const updateIncidentReport = async (
  id: string,
  updates: Partial<IncidentReport>
): Promise<{ success: boolean; data?: IncidentReport; error?: string }> => {
  const started = Date.now();
  const supabase = await useServerSideSupabaseAnonClient();

  const { data, error } = await supabase
    .from(TABLES.INCIDENT_REPORTS!)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    log(`Error updating incident report with payload: ${JSON.stringify({ id, updates })}: ${error.message}`);
    await logServerAction({
      user_id: null,
      action: 'incident.update',
      duration_ms: Date.now() - started,
      error: error.message,
      payload: { id, updates },
      status: 'fail',
      type: 'db',
    });
    return { success: false, error: error.message };
  }

  await logServerAction({
    user_id: null,
    action: 'incident.update',
    duration_ms: Date.now() - started,
    error: '',
    payload: { id, updates },
    status: 'success',
    type: 'db',
  });

  revalidateIncidents();
  return { success: true, data };
};

export const deleteIncidentReport = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  const started = Date.now();
  const supabase = await useServerSideSupabaseAnonClient();

  const { error } = await supabase.from(TABLES.INCIDENT_REPORTS!).delete().eq('id', id);

  if (error) {
    log(`Error deleting incident report with payload: ${JSON.stringify({ id })}: ${error.message}`);
    await logServerAction({
      user_id: null,
      action: 'incident.delete',
      duration_ms: Date.now() - started,
      error: error.message,
      payload: { id },
      status: 'fail',
      type: 'db',
    });
    return { success: false, error: error.message };
  }

  await logServerAction({
    user_id: null,
    action: 'incident.delete',
    duration_ms: Date.now() - started,
    error: '',
    payload: { id },
    status: 'success',
    type: 'db',
  });

  revalidateIncidents();
  return { success: true };
};

export const getIncidentReportsFromBuilding = async (
  buildingId: string
): Promise<{ success: boolean; data?: IncidentReport[]; error?: string }> => {
  const supabase = await useServerSideSupabaseAnonClient();
  const { data, error } = await supabase
    .from(TABLES.INCIDENT_REPORTS!)
    .select('*')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false });

  if (error) {
    log(`Error getting incident reports from building with payload: ${JSON.stringify({ buildingId })}: ${error.message}`);
    await logServerAction({
      user_id: null,
      action: 'incident.getFromBuilding',
      duration_ms: 0,
      error: error.message,
      payload: { buildingId },
      status: 'fail',
      type: 'db',
    });
    return { success: false, error: error.message };
  }
  return { success: true, data: data ?? [] };
}
