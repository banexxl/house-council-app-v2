import { redirect } from 'next/navigation';
import { getViewer } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { getAllBuildings, getAllBuildingsFromClient } from 'src/app/actions/building/building-actions';
import { getPollById } from 'src/app/actions/poll/polls';
import { getPollOptions } from 'src/app/actions/poll/poll-options';
import { getAttachments } from 'src/app/actions/poll/poll-attachments';
import { getVotesByPoll } from 'src/app/actions/poll/poll-votes';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { toStorageRef } from 'src/utils/sb-bucket';
import PollCreate from './poll-create';

type Props = { params: Promise<{ poll: string }> };

export default async function PollCreatePage({ params }: Props) {
  const { poll: idOrCreate } = await params;
  const { client, clientMember, tenant, admin } = await getViewer();
  const client_id = client ? client.id : clientMember ? clientMember.client_id : null;

  if (!client && !clientMember && !tenant && !admin) {
    logout();
  }

  // Buildings for select lists
  let buildings: any[] = [];
  if (admin) {
    const { data } = await getAllBuildings();
    buildings = Array.isArray(data) ? data : [];
  } else if (client || clientMember) {
    const { data } = await getAllBuildingsFromClient(client_id!);
    buildings = Array.isArray(data) ? data : [];
  } else if (tenant) {
    redirect('/dashboard/products');
  }

  if (idOrCreate === 'create' || idOrCreate === 'new') {
    return <PollCreate buildings={buildings} clientId={client_id || ''} />;
  }

  // Edit existing poll
  const [
    { data: pollRes },
  ] = await Promise.all([
    getPollById(idOrCreate),
  ]);
  console.log('poll', pollRes);

  return (
    <PollCreate
      buildings={buildings}
      clientId={client_id || ''}
      poll={pollRes}
    />
  );
}
