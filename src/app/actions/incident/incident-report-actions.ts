'use server';

import { revalidatePath } from 'next/cache';
import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { getViewer } from 'src/libs/supabase/server-auth';
import type { IncidentReport, IncidentStatus, IncidentCategory, IncidentPriority } from 'src/types/incident-report';
import log from 'src/utils/logger';

const REVALIDATE_PATHS = ['/dashboard/service-requests', '/dashboard/service-requests/create'];

const revalidateIncidents = () => {
  REVALIDATE_PATHS.forEach((path) => revalidatePath(path));
};

export const createIncidentFromForm = async (payload: {
  title: string;
  description: string;
  category: IncidentCategory;
  priority: IncidentPriority;
  buildingId: string;
  apartmentId?: string | null;
  isEmergency?: boolean;
}): Promise<{ success: boolean; data?: IncidentReport; error?: string }> => {
  if (!payload.title?.trim() || !payload.description?.trim()) {
    return { success: false, error: 'Title and description are required' };
  }
  if (!payload.buildingId?.trim()) {
    return { success: false, error: 'Building is required' };
  }

  const viewer = await getViewer();
  if (!viewer.userData) {
    return { success: false, error: 'Not authenticated' };
  }

  const adminSupabase = await useServerSideSupabaseServiceRoleClient();

  const { data: buildingRow, error: buildingError } = await adminSupabase
    .from(TABLES.BUILDINGS!)
    .select('id, client_id')
    .eq('id', payload.buildingId)
    .single();

  if (buildingError || !buildingRow?.client_id) {
    return { success: false, error: buildingError?.message || 'Building not found' };
  }

  let reporterProfileId: string | null = null;
  if (viewer.tenant?.id) {
    const { data: profileRow } = await adminSupabase
      .from(TABLES.TENANT_PROFILES)
      .select('id')
      .eq('tenant_id', viewer.tenant.id)
      .maybeSingle();
    reporterProfileId = (profileRow as any)?.id || null;
  }

  const incidentPayload: Omit<IncidentReport, 'id' | 'created_at' | 'updated_at'> = {
    client_id: (buildingRow as any).client_id,
    building_id: payload.buildingId,
    apartment_id: payload.apartmentId || null,
    created_by_profile_id:
      reporterProfileId ||
      viewer.clientMember?.id ||
      viewer.client?.id ||
      viewer.admin?.id ||
      viewer.userData.id,
    created_by_tenant_id: viewer.tenant?.id ?? null,
    assigned_to_profile_id: null,
    title: payload.title.trim(),
    description: payload.description.trim(),
    category: payload.category,
    priority: payload.priority,
    status: 'open',
    is_emergency: !!payload.isEmergency,
    resolved_at: null,
    closed_at: null,
  };

  return createIncidentReport(incidentPayload);
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
