import { Seo } from 'src/components/seo';
import { IncidentCreateClient } from './incident-create-client';
import { getViewer } from 'src/libs/supabase/server-auth';
import {
  getBuildingIdFromTenantId,
  getClientIdFromTenantBuilding,
  getAllBuildingsWithApartmentsForClient,
  getAllTenantsFromClientsBuildings,
} from 'src/app/actions/tenant/tenant-actions';
import {
  getBuildingIDsFromUserId,
} from 'src/app/actions/building/building-actions';
import { getCurrentUserProfile, getTenantProfileByTenantId } from 'src/app/actions/social/profile-actions';
import log from 'src/utils/logger';

const Page = async () => {
  const { tenant, client, clientMember, userData } = await getViewer();

  let defaultBuildingId: string | undefined;
  let defaultClientId: string | undefined;
  const defaultApartmentId = tenant?.apartment_id ?? null;
  const defaultTenantId = tenant?.id ?? null;
  let buildingOptions: Array<{ id: string; label: string; apartments: { id: string; apartment_number: string }[] }> =
    [];
  let defaultAssigneeProfile = '';
  let defaultReporterProfile = '';
  let defaultReporterName = '';
  let assigneeOptions: Array<{ id: string; label: string; buildingId?: string | null }> = [];

  const profileRes = tenant?.id ? await getTenantProfileByTenantId(tenant.id) : await getCurrentUserProfile();
  const currentProfile = profileRes.success ? profileRes.data : null;
  log(`Current profile: ${currentProfile ? JSON.stringify(currentProfile) : profileRes.error}`);
  if (tenant?.id) {
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
    defaultAssigneeProfile = currentProfile.id;
    defaultReporterProfile = currentProfile.id;
    defaultReporterName = displayName;
    assigneeOptions.push({ id: currentProfile.id, label: displayName, buildingId: defaultBuildingId });
  } else if (client) {
    const idValue = client.user_id || client.id;
    defaultAssigneeProfile = idValue;
    defaultReporterProfile = idValue;
    defaultReporterName = client.contact_person || client.id;
    assigneeOptions.push({ id: idValue, label: client.contact_person || client.id });
  } else if (clientMember) {
    defaultAssigneeProfile = clientMember.id;
    defaultReporterProfile = clientMember.id;
    defaultReporterName = clientMember.name || clientMember.email || clientMember.id;
    assigneeOptions.push({ id: clientMember.id, label: clientMember.name || clientMember.email || clientMember.id });
  } else if (tenant) {
    const label = `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim() || tenant.id;
    defaultAssigneeProfile = tenant.id;
    defaultReporterProfile = tenant.id;
    defaultReporterName = label;
    assigneeOptions.push({ id: tenant.id, label, buildingId: defaultBuildingId });
  } else if (userData?.id) {
    defaultReporterProfile = userData.id;
    defaultAssigneeProfile = userData.id;
    defaultReporterName = userData.email ?? userData.id;
  }

  return (
    <>
      <Seo title="Incidents: Report new incident" />
      <IncidentCreateClient
        defaultApartmentId={defaultApartmentId}
        defaultBuildingId={defaultBuildingId}
        defaultClientId={defaultClientId}
        defaultTenantId={defaultTenantId}
        defaultReporterProfileId={defaultReporterProfile}
        defaultReporterName={defaultReporterName}
        defaultAssigneeProfileId={defaultAssigneeProfile}
        buildingOptions={buildingOptions}
        assigneeOptions={assigneeOptions}
      />
    </>
  );
};

export default Page;
