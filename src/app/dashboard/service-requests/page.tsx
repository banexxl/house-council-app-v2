import { listIncidentReportsForClient } from 'src/app/actions/incident/incident-report-actions';
import { IncidentsClient } from './incidents-client';
import { getViewer } from 'src/libs/supabase/server-auth';
import { redirect } from 'next/navigation';
import { getClientIdFromTenantBuilding } from 'src/app/actions/tenant/tenant-actions';

const Page = async () => {

  const { client, clientMember, tenant, admin, userData } = await getViewer();
  let client_id = client ? client.id : clientMember ? clientMember.client_id : null;
  if (!client && !clientMember && !tenant && !admin) {
    redirect('/auth/login');
  }
  if (tenant) {
    const { success, data } = await getClientIdFromTenantBuilding(tenant.id);
    if (success && data) {
      client_id = data;
    } else {
      redirect('/dashboard');
    }
  }
  const result = await listIncidentReportsForClient(client_id);
  const incidents = result.success && Array.isArray(result.data) ? result.data : [];

  return <IncidentsClient incidents={incidents} />

};

export default Page;
