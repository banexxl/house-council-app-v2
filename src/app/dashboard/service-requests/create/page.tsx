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
  let assigneeOptions: Array<{ id: string; label: string; buildingId?: string | null }> = [];

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

  if (client?.contact_person) {
    defaultAssigneeProfile = client.contact_person;
    defaultReporterProfile = client.contact_person;
    assigneeOptions.push({ id: client.contact_person, label: client.contact_person });
  } else if (clientMember?.name) {
    defaultAssigneeProfile = clientMember.name;
    defaultReporterProfile = clientMember.name;
    assigneeOptions.push({ id: clientMember.name, label: clientMember.name });
  } else if (tenant?.first_name || tenant?.last_name) {
    defaultAssigneeProfile = `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim();
    defaultReporterProfile = defaultAssigneeProfile;
    assigneeOptions.push({ id: defaultReporterProfile, label: defaultReporterProfile, buildingId: defaultBuildingId });
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
        defaultAssigneeProfileId={defaultAssigneeProfile}
        buildingOptions={buildingOptions}
        assigneeOptions={assigneeOptions}
      />
    </>
  );
};

export default Page;
