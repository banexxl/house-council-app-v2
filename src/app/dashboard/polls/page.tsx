import { redirect } from 'next/navigation';
import { getViewer } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { getPollsFromClient } from 'src/app/actions/poll/poll-actions';
import { getAllBuildings, getAllBuildingsFromClient } from 'src/app/actions/building/building-actions';
import Polls from './polls';

export default async function PollsPage() {

  const { client, clientMember, tenant, admin } = await getViewer();
  const client_id = client ? client.id : clientMember ? clientMember.client_id : null;

  if (!client && !clientMember && !tenant && !admin) {
    await logout();
  }

  // Load polls based on role
  let polls: any[] = [];
  if (admin) {
    const { data } = await getPollsFromClient();
    polls = Array.isArray(data) ? data : [];
  } else if (client || clientMember) {

    const { data } = await getPollsFromClient({ client_id: client_id! });
    polls = Array.isArray(data) ? data : [];
  } else if (tenant) {
    redirect('/dashboard/social/profile');
  }

  // Buildings to help render human-readable building labels
  let buildings: any[] = [];
  if (admin) {
    const { data } = await getAllBuildings();
    buildings = Array.isArray(data) ? data : [];
  } else if (client || clientMember) {
    const { data } = await getAllBuildingsFromClient(client_id!);
    buildings = Array.isArray(data) ? data : [];
  }

  return <Polls polls={polls} buildings={buildings} />;
}

