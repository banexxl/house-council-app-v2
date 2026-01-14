import { listIncidentReports, listIncidentReportsForClient } from 'src/app/actions/incident/incident-report-actions';
import { IncidentsClient } from './incidents-client';
import { getViewer } from 'src/libs/supabase/server-auth';
import { redirect } from 'next/navigation';
import { getBuildingIDsFromUserId } from 'src/app/actions/building/building-actions';

const Page = async () => {

  const { customer, tenant, admin, userData } = await getViewer();

  if (!client && !clientMember && !tenant && !admin) {
    redirect('/auth/login');
  }

  let incidents: any[] = [];

  if (client || clientMember) {
    const customerId = client?.id || clientMember?.customerId;
    const result = await listIncidentReportsForClient(customerId!);
    incidents = result.success && Array.isArray(result.data) ? result.data : [];
  } else if (tenant) {
    let buildingIds: string[] = [];
    if (userData?.id) {
      const { success, data } = await getBuildingIDsFromUserId(userData.id);
      if (success && Array.isArray(data)) {
        buildingIds = data;
      }
    }
    if (!buildingIds.length) {
      redirect('/dashboard');
    }
    const result = await listIncidentReports({ buildingIds });
    incidents = result.success && Array.isArray(result.data) ? result.data : [];
  } else if (admin) {
    const result = await listIncidentReports();
    incidents = result.success && Array.isArray(result.data) ? result.data : [];
  }

  return <IncidentsClient incidents={incidents} />

};

export default Page;
