import { listIncidentReportsForClient } from 'src/app/actions/incident/incident-report-actions';
import { IncidentsClient } from './incidents-client';
import { getViewer } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';

const Page = async () => {

  const { client, clientMember, tenant, admin, userData } = await getViewer();
  const client_id = client ? client.id : clientMember ? clientMember.client_id : null;
  if (!client && !clientMember && !tenant && !admin) {
    logout();
  }
  const result = await listIncidentReportsForClient(client_id);
  const incidents = result.success && Array.isArray(result.data) ? result.data : [];

  return <IncidentsClient incidents={incidents} />

};

export default Page;
