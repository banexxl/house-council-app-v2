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
import log from 'src/utils/logger';
import { IncidentCreate } from './incident-create';

interface PageProps {
  params: Promise<{ requestId: string }>;
}

const Page = async ({ params }: PageProps) => {
  const resolvedParams = await params;
  const incidentId = resolvedParams?.requestId;

  const { success: found, data: incident } = incidentId ? await getIncidentReportById(incidentId) : { success: false, data: null };
  const { tenant, client, clientMember, userData } = await getViewer();

  let defaultBuildingId: string | undefined = incident?.building_id ?? undefined;
  let defaultClientId: string | undefined = incident?.client_id ?? undefined;
  const defaultApartmentId = incident?.apartment_id ?? tenant?.apartment_id ?? null;
  const defaultTenantId = incident?.created_by_tenant_id ?? tenant?.id ?? null;
  let buildingOptions: Array<{ id: string; label: string; apartments: { id: string; apartment_number: string }[] }> = [];
  let defaultAssigneeProfile = incident?.assigned_to_profile_id ?? '';
  let defaultReporterProfile = incident?.created_by_profile_id ?? '';
  let defaultReporterName = '';
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
  if (!defaultClientId && clientMember?.client_id) {
    defaultClientId = clientMember.client_id;
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
    defaultReporterProfile = defaultReporterProfile || currentProfile.id;
    defaultReporterName = displayName;
    assigneeOptions.push({ id: currentProfile.id, label: displayName, buildingId: defaultBuildingId });
  } else if (client) {
    const idValue = client.user_id || client.id;
    defaultAssigneeProfile = defaultAssigneeProfile || idValue;
    defaultReporterProfile = defaultReporterProfile || idValue;
    defaultReporterName = client.contact_person || client.id;
    assigneeOptions.push({ id: idValue, label: client.contact_person || client.id });
  } else if (clientMember) {
    defaultAssigneeProfile = defaultAssigneeProfile || clientMember.id;
    defaultReporterProfile = defaultReporterProfile || clientMember.id;
    defaultReporterName = clientMember.name || clientMember.email || clientMember.id;
    assigneeOptions.push({ id: clientMember.id, label: clientMember.name || clientMember.email || clientMember.id });
  } else if (tenant) {
    const label = `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim() || tenant.id;
    defaultAssigneeProfile = defaultAssigneeProfile || tenant.id;
    defaultReporterProfile = defaultReporterProfile || tenant.id;
    defaultReporterName = label;
    assigneeOptions.push({ id: tenant.id, label, buildingId: defaultBuildingId });
  } else if (userData?.id) {
    defaultReporterProfile = defaultReporterProfile || userData.id;
    defaultAssigneeProfile = defaultAssigneeProfile || userData.id;
    defaultReporterName = userData.email ?? userData.id;
  }

  if (!defaultReporterName && incident?.created_by_profile_id) {
    defaultReporterName = incident.created_by_profile_id;
  }

  if (incident?.assigned_to_profile_id && !assigneeOptions.find((a) => a.id === incident.assigned_to_profile_id)) {
    assigneeOptions.push({ id: incident.assigned_to_profile_id, label: incident.assigned_to_profile_id });
  }

  const title = incident ? 'Incidents: Edit incident' : 'Incidents: Report new incident';

  return (
    <IncidentCreate
      defaultApartmentId={defaultApartmentId}
      defaultBuildingId={defaultBuildingId}
      defaultClientId={defaultClientId}
      defaultTenantId={defaultTenantId}
      defaultReporterProfileId={defaultReporterProfile}
      defaultReporterName={defaultReporterName}
      defaultAssigneeProfileId={defaultAssigneeProfile}
      buildingOptions={buildingOptions}
      assigneeOptions={assigneeOptions}
      incident={found ? incident ?? undefined : undefined}
    />
  );
};

export default Page;
