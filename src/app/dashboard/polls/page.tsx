import { redirect } from 'next/navigation';
import { getViewer } from 'src/libs/supabase/server-auth';
import { getPollsFromClient } from 'src/app/actions/poll/poll-actions';
import { getAllBuildings, getAllBuildingsFromClient } from 'src/app/actions/building/building-actions';
import Polls from './polls';

export default async function PollsPage() {

  const { customer, tenant, admin } = await getViewer();
  if (!customer && !tenant && !admin) {
    redirect('/auth/login');
  }

  // Load polls based on role
  let polls: any[] = [];
  if (admin) {
    const { data } = await getPollsFromClient();
    polls = Array.isArray(data) ? data : [];
  } else if (customer) {

    const { data } = await getPollsFromClient({ customerId: customer.id });
    polls = Array.isArray(data) ? data : [];
  } else if (tenant) {
    redirect('/dashboard/social/profile');
  }

  // Buildings to help render human-readable building labels
  let buildings: any[] = [];
  if (admin) {
    const { data } = await getAllBuildings();
    buildings = Array.isArray(data) ? data : [];
  } else if (customer) {
    const { data } = await getAllBuildingsFromClient(customer.id);
    buildings = Array.isArray(data) ? data : [];
  }

  return <Polls polls={polls} buildings={buildings} />;
}

