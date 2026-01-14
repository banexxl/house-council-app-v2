import { getIncidentReportById } from 'src/app/actions/incident/incident-report-actions';
import {
  getAllBuildingsWithApartmentsForClient,
  getAllTenantsFromClientsBuildings,
  getBuildingIdFromTenantId,
  getClientIdFromTenantBuilding,
} from 'src/app/actions/tenant/tenant-actions';
import { getBuildingIDsFromUserId } from 'src/app/actions/building/building-actions';
import { getCurrentUserProfile, getTenantProfileByTenantId } from 'src/app/actions/social/profile-actions';
import { getViewer } from 'src/libs/supabase/server-auth';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { TABLES } from 'src/libs/supabase/tables';
import log from 'src/utils/logger';
import { IncidentCreate } from './incident-create';

interface PageProps {
  params: Promise<{ requestId: string }>;
}

const resolveReporterName = async (id: string | null | undefined): Promise<string> => {
  if (!id) return '';
  try {
    const supabase = await useServerSideSupabaseAnonClient();

    const { data: clientRow } = await supabase
      .from(TABLES.CLIENTS)
      .select('contact_person, email, id, user_id')
      .or(`id.eq.${id},user_id.eq.${id}`)
      .maybeSingle();
    if (clientRow) {
      return (clientRow as any).contact_person || (clientRow as any).email || (clientRow as any).id || '';
    }

    const { data: memberRow } = await supabase
      .from(TABLES.CLIENT_MEMBERS)
      .select('name, email, id, user_id')
      .or(`id.eq.${id},user_id.eq.${id}`)
      .maybeSingle();
    if (memberRow) {
      return (memberRow as any).name || (memberRow as any).email || (memberRow as any).id || '';
    }

    const { data: tenantRow } = await supabase
      .from(TABLES.TENANTS)
      .select('first_name, last_name, email, id, user_id')
      .or(`id.eq.${id},user_id.eq.${id}`)
      .maybeSingle();
    if (tenantRow) {
      const first = (tenantRow as any).first_name || '';
      const last = (tenantRow as any).last_name || '';
      const full = `${first} ${last}`.trim();
      return full || (tenantRow as any).email || (tenantRow as any).id || '';
    }

    return id;
  } catch (e: any) {
    log(`resolveReporterName failed for ${id}: ${e?.message || e}`);
    return id;
  }
};

const Page = async ({ params }: PageProps) => {
  const resolvedParams = await params;
  const incidentId = resolvedParams?.requestId;

  const { success: found, data: incident } = incidentId ? await getIncidentReportById(incidentId) : { success: false, data: null };
  const { tenant, client, clientMember, userData } = await getViewer();
  log(`Loaded incident report page for incidentId: ${incidentId}, found: ${found}, incident: ${incident ? JSON.stringify(incident) : 'null'}`);
  let defaultBuildingId: string | undefined = incident?.building_id ?? undefined;
  let defaultClientId: string | undefined = incident?.customerId ?? undefined;
  const defaultApartmentId = incident?.apartment_id ?? tenant?.apartment_id ?? null;
  const defaultTenantId = tenant?.id ?? null;
  let buildingOptions: Array<{ id: string; label: string; apartments: { id: string; apartment_number: string }[] }> = [];
  let defaultAssigneeProfile = incident?.assigned_to ?? '';
  let defaultReporterName = incident?.reported_by ?? '';
  let defaultReporterId = incident?.reported_by ?? userData?.id ?? '';
  let assigneeOptions: Array<{ id: string; label: string; buildingId?: string | null }> = [];

  const profileRes = tenant?.id ? await getTenantProfileByTenantId(tenant.id) : await getCurrentUserProfile();
  const currentProfile = profileRes.success ? profileRes.data : null;
  log(`Current profile: ${currentProfile ? JSON.stringify(currentProfile) : profileRes.error}`);

  if (tenant?.id && !defaultBuildingId) {
    const [buildingRes, clientRes] = await Promise.all([
      getBuildingIdFromTenantId(tenant.id),
      getClientIdFromTenantBuilding(tenant.id),
    ]);

    if (buildingRes.success && buildingRes.data) {
      defaultBuildingId = buildingRes.data;
    }
    if (clientRes.success && clientRes.data) {
      defaultClientId = clientRes.data;
    }
  }

  if (!defaultClientId && client?.id) {
    defaultClientId = client.id;
  }
  if (!defaultClientId && clientMember?.customerId) {
    defaultClientId = clientMember.customerId;
  }

  if (!defaultBuildingId && userData?.id) {
    const buildingListRes = await getBuildingIDsFromUserId(userData.id);
    if (buildingListRes.success && buildingListRes.data?.length === 1) {
      defaultBuildingId = buildingListRes.data[0];
    }
  }

  if (defaultClientId) {
    const [buildingsRes, tenantsRes] = await Promise.all([
      getAllBuildingsWithApartmentsForClient(defaultClientId),
      getAllTenantsFromClientsBuildings(defaultClientId),
    ]);
    if (buildingsRes.success && buildingsRes.data?.length) {
      buildingOptions = buildingsRes.data.map((b) => ({
        id: b.id,
        label: b.name || b.id,
        apartments: b.apartments || [],
      }));
      if (!defaultBuildingId && buildingOptions.length === 1) {
        defaultBuildingId = buildingOptions[0].id;
      }
    }
    if (tenantsRes.success && tenantsRes.data?.length) {
      assigneeOptions.push(
        ...tenantsRes.data.map((t) => ({
          id: t.id,
          label: `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() || t.email || t.id,
          buildingId: (t.apartment as any)?.building?.id ?? undefined,
        }))
      );
    }
  }

  if (currentProfile?.id) {
    const displayName = `${currentProfile.first_name ?? ''} ${currentProfile.last_name ?? ''}`.trim() ||
      currentProfile.id;
    defaultAssigneeProfile = defaultAssigneeProfile || currentProfile.id;
    defaultReporterName = defaultReporterName || displayName;
    assigneeOptions.push({ id: currentProfile.id, label: displayName, buildingId: defaultBuildingId });
  } else if (client) {
    const idValue = client.user_id || client.id;
    defaultAssigneeProfile = defaultAssigneeProfile || idValue;
    defaultReporterName = defaultReporterName || client.contact_person || client.id;
    defaultReporterId = defaultReporterId || idValue;
    assigneeOptions.push({ id: idValue, label: client.contact_person || client.id });
  } else if (clientMember) {
    defaultAssigneeProfile = defaultAssigneeProfile || clientMember.id;
    defaultReporterName = defaultReporterName || clientMember.name || clientMember.email || clientMember.id;
    defaultReporterId = defaultReporterId || clientMember.id;
    assigneeOptions.push({ id: clientMember.id, label: clientMember.name || clientMember.email || clientMember.id });
  } else if (tenant) {
    const label = `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim() || tenant.id;
    defaultAssigneeProfile = defaultAssigneeProfile || tenant.id;
    defaultReporterName = defaultReporterName || label;
    defaultReporterId = defaultReporterId || tenant.id;
    assigneeOptions.push({ id: tenant.id, label, buildingId: defaultBuildingId });
  } else if (userData?.id) {
    defaultAssigneeProfile = defaultAssigneeProfile || userData.id;
    defaultReporterName = defaultReporterName || (userData.email ?? userData.id);
    defaultReporterId = defaultReporterId || userData.id;
  }

  if (incident?.assigned_to && !assigneeOptions.find((a) => a.id === incident.assigned_to)) {
    assigneeOptions.push({ id: incident.assigned_to, label: incident.assigned_to });
  }

  if (incident?.reported_by) {
    defaultReporterName = await resolveReporterName(incident.reported_by);
  }

  const title = incident ? 'Incidents: Edit incident' : 'Incidents: Report new incident';

  return (
    <IncidentCreate
      defaultApartmentId={defaultApartmentId}
      defaultBuildingId={defaultBuildingId}
      defaultClientId={defaultClientId}
      defaultTenantId={defaultTenantId}
      defaultReporterName={defaultReporterName}
      defaultReporterId={defaultReporterId}
      defaultAssigneeProfileId={defaultAssigneeProfile}
      buildingOptions={buildingOptions}
      assigneeOptions={assigneeOptions}
      incident={found ? incident ?? undefined : undefined}
    />
  );
};

export default Page;
