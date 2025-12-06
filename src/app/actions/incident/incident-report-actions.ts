'use server';

import { revalidatePath } from 'next/cache';
import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import type { IncidentReport, IncidentStatus, IncidentCategory, IncidentPriority } from 'src/types/incident-report';
import { getAllBuildingsFromClient, getBuildingIDsFromUserId } from 'src/app/actions/building/building-actions';
import log from 'src/utils/logger';
import { getServerI18n, tokens as serverTokens } from 'src/locales/i18n-server';
import { sendViaEmail } from 'src/app/actions/notification/senders';
import { emitNotifications } from 'src/app/actions/notification/emit-notification';
import { createIncidentNotification } from 'src/utils/notification';
import type { BaseNotification } from 'src/types/notification';
import { readAllTenantsFromBuildingIds } from 'src/app/actions/tenant/tenant-actions';

export const listIncidentReportsForClient = async (client_id: string | null): Promise<{ success: boolean; data?: IncidentReport[]; error?: string }> => {

  if (!client_id) {
    return { success: true, data: [] };
  }

  const buildingListRes = await getAllBuildingsFromClient(client_id);
  const buildingIds = Array.isArray(buildingListRes.data) ? buildingListRes.data.map(b => b.id) : [];
  if (buildingListRes.success && buildingListRes.data?.length) {
    return listIncidentReports({ buildingIds });
  }


  return { success: true, data: [] };
};

export const createIncidentReport = async (
  payload: Omit<IncidentReport, 'id' | 'created_at' | 'updated_at'>,
  locale: string = 'rs'
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

  try {
    const t = await getServerI18n(locale || 'rs');

    const subject =
      t(serverTokens.email.incidentCreatedTitle) ||
      'New service request created';

    const intro =
      t(serverTokens.email.incidentCreatedBodyIntro) ||
      'A new service request has been created for your building.';

    const descriptionLabel =
      t(serverTokens.email.incidentCreatedBodyDescriptionLabel) ||
      'Request details';

    const ctaLabel =
      t(serverTokens.email.incidentCreatedBodyCta) ||
      'View request';

    const title = (data as any)?.title ?? '';
    const description = (data as any)?.description ?? '';

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const incidentPath = `/dashboard/service-requests/${(data as any)?.id}`;

    const injectedHtml = `
      <p>${intro}</p>
      <p><strong>${title}</strong></p>
      ${description ? `<p><strong>${descriptionLabel}:</strong> ${description}</p>` : ''}
      <p>
        <a href="${appBaseUrl}${incidentPath}">
          ${ctaLabel}
        </a>
      </p>
    `;

    const incidentBuildingId = (data as any)?.building_id as string | null;
    const incidentClientId = (data as any)?.client_id as string | null;
    const reporterId = (data as any)?.reported_by as string | null;

    // 1) Send emails to all tenants in the incident's building using shared helper
    if (incidentBuildingId) {
      const { data: tenants, error: tenantsError } = await readAllTenantsFromBuildingIds([incidentBuildingId]);
      if (tenantsError) {
        log(`Error reading tenants for incident email: ${tenantsError}`);
      }
      if (tenants && tenants.length) {
        for (const tenant of tenants as any[]) {
          const email = tenant.email
            || tenant.user?.email
            || tenant.apartment?.tenant_email
            || tenant.apartment?.building?.client?.email;
          if (!email) continue;
          // eslint-disable-next-line no-void
          void sendViaEmail(email, subject, injectedHtml);
        }
      }
    }

    // 2) Send email to the client for this incident (if any)
    if (incidentClientId) {
      const { data: client } = await supabase
        .from(TABLES.CLIENTS!)
        .select('email')
        .eq('id', incidentClientId)
        .maybeSingle();

      const clientEmail = (client as any)?.email as string | undefined;
      if (clientEmail) {
        // eslint-disable-next-line no-void
        void sendViaEmail(clientEmail, subject, injectedHtml);
      }
    }

    // 3) Send emails to all client members attached to that client
    if (incidentClientId) {
      const { data: clientMembers } = await supabase
        .from(TABLES.CLIENT_MEMBERS!)
        .select('email, client_id')
        .eq('client_id', incidentClientId);

      if (clientMembers && clientMembers.length) {
        for (const member of clientMembers as any[]) {
          const email = member.email as string | undefined;
          if (!email) continue;
          // eslint-disable-next-line no-void
          void sendViaEmail(email, subject, injectedHtml);
        }
      }
    }

    // 4) Also create an in-app notification for the reporter (if we can resolve them)
    if (reporterId) {
      const { data: reporterTenant } = await supabase
        .from(TABLES.TENANTS!)
        .select('user_id')
        .eq('id', reporterId)
        .maybeSingle();

      const { data: reporterClientMember } = await supabase
        .from(TABLES.CLIENT_MEMBERS!)
        .select('user_id')
        .eq('id', reporterId)
        .maybeSingle();

      const { data: reporterClient } = await supabase
        .from(TABLES.CLIENTS!)
        .select('user_id')
        .eq('id', reporterId)
        .maybeSingle();

      const createdAtISO = new Date().toISOString();
      const building_id = incidentBuildingId || '';
      const user_id =
        (reporterTenant as any)?.user_id ||
        (reporterClientMember as any)?.user_id ||
        (reporterClient as any)?.user_id ||
        reporterId;

      if (building_id && user_id) {
        const incidentNotification = createIncidentNotification({
          action_token: 'notifications.actions.notificationActionIncidentCreated',
          description,
          created_at: createdAtISO,
          is_read: false,
          incident_id: (data as any)?.id,
          building_id,
          user_id,
          url: incidentPath,
          title,
        });

        const rows = [incidentNotification] as unknown as BaseNotification[];
        const emitted = await emitNotifications(rows as any);
        if (!emitted.success) {
          await logServerAction({
            user_id: null,
            action: 'incident.create.notifications',
            duration_ms: 0,
            error: emitted.error || 'emitFailed',
            payload: { incident_id: (data as any)?.id, reporterId },
            status: 'fail',
            type: 'db',
          });
        } else {
          await logServerAction({
            user_id: null,
            action: 'incident.create.notifications',
            duration_ms: 0,
            error: '',
            payload: { incident_id: (data as any)?.id, reporterId },
            status: 'success',
            type: 'db',
          });
        }
      }
    }
  } catch (err) {
    log(`Error sending incident created email: ${(err as Error)?.message}`);
  }

  revalidatePath('/dashboard/service-requests');
  return { success: true, data };
};

export const getIncidentReportById = async (
  id: string
): Promise<{ success: boolean; data?: IncidentReport; error?: string }> => {
  const supabase = await useServerSideSupabaseAnonClient();
  const { data, error } = await supabase
    .from(TABLES.INCIDENT_REPORTS!)
    .select(`
      *,
      building:building_id ( id ),
      apartment:apartment_id ( id, apartment_number )
    `)
    .eq('id', id)
    .single();
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
  const mapped: IncidentReport = {
    ...(data as any),
    building_label: (data as any)?.building?.name ?? null,
    apartment_number: (data as any)?.apartment?.apartment_number ?? null,
  };
  if (!mapped.building_label && mapped.building_id) {
    try {
      const supabase = await useServerSideSupabaseAnonClient();
      const { data: loc } = await supabase
        .from(TABLES.BUILDING_LOCATIONS!)
        .select('street_address, street_number, city')
        .eq('building_id', mapped.building_id)
        .maybeSingle();
      if (loc) {
        const label = [loc.street_address, loc.street_number, loc.city].filter(Boolean).join(' ').trim();
        mapped.building_label = label || mapped.building_id;
      }
    } catch {
      // ignore lookup failures
    }
  }
  if (!mapped.building_label) {
    mapped.building_label = mapped.building_id;
  }
  return { success: true, data: mapped };
};

export const listIncidentReports = async (filters?: {
  clientId?: string;
  buildingId?: string;
  buildingIds?: string[];
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
  let query = supabase
    .from(TABLES.INCIDENT_REPORTS)
    .select(`
      *,
      building:building_id ( id ),
      apartment:apartment_id ( id, apartment_number )
    `)
    .order('created_at', { ascending: false });

  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId);
  }
  if (filters?.buildingId) {
    query = query.eq('building_id', filters.buildingId);
  }
  if (filters?.buildingIds?.length) {
    query = query.in('building_id', filters.buildingIds);
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
  const mapped = (data || []).map((row: any) => ({
    ...row,
    building_label: row?.building?.name ?? null,
    apartment_number: row?.apartment?.apartment_number ?? null,
  }));

  const missingBuildingIds = mapped
    .filter((m) => !m.building_label && m.building_id)
    .map((m) => m.building_id);
  const uniqueMissing = Array.from(new Set(missingBuildingIds));

  if (uniqueMissing.length) {
    try {
      const supabase = await useServerSideSupabaseAnonClient();
      const { data: locs } = await supabase
        .from(TABLES.BUILDING_LOCATIONS!)
        .select('building_id, street_address, street_number, city')
        .in('building_id', uniqueMissing);
      const locMap = new Map<string, string>();
      (locs || []).forEach((loc: any) => {
        const label = [loc.street_address, loc.street_number, loc.city].filter(Boolean).join(' ').trim();
        if (loc.building_id) locMap.set(loc.building_id, label || loc.building_id);
      });
      mapped.forEach((m) => {
        if (!m.building_label && m.building_id && locMap.has(m.building_id)) {
          m.building_label = locMap.get(m.building_id) || m.building_id;
        }
      });
    } catch {
      // ignore lookup failures
    }
  }
  mapped.forEach((m) => {
    if (!m.building_label) {
      m.building_label = m.building_id;
    }
  });
  return { success: true, data: mapped };
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

  revalidatePath(`/dashboard/service-requests/${id}`);
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

  revalidatePath('/dashboard/service-requests');
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
