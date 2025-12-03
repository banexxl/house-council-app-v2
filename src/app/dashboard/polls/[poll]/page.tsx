import { redirect } from 'next/navigation';
import { getViewer } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { getAllBuildings, getAllBuildingsFromClient } from 'src/app/actions/building/building-actions';
import { getPollById } from 'src/app/actions/poll/poll-actions';
import PollCreate from './poll-create';
import { paths } from 'src/paths';

type Props = { params: Promise<{ poll: string }> };

export default async function PollCreatePage({ params }: Props) {
  const { poll: idOrCreate } = await params;
  const { client, clientMember, tenant, admin } = await getViewer();
  const client_id = client ? client.id : clientMember ? clientMember.client_id : null;

  if (!client && !clientMember && !tenant && !admin) {
    try {
    } catch (err) {
      console.warn('Logout failed, continuing anyway', err);
    }
    redirect(paths.auth.login);
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
    redirect('/dashboard/social/profile');
  }

  if (idOrCreate === 'create' || idOrCreate === 'new') {
    return <PollCreate buildings={buildings} clientId={client_id || ''} />;
  }

  // Edit existing poll
  const { data: pollRes } = await getPollById(idOrCreate);

  const normalizedPoll = pollRes
    ? {
      ...pollRes,
      attachments: (pollRes.attachments ?? []).map((attachment: any) => ({
        ...attachment,
        storage_bucket:
          attachment.storage_bucket || process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET || '',
      })),
    }
    : undefined;

  return (
    <PollCreate
      buildings={buildings}
      clientId={client_id || ''}
      poll={normalizedPoll}
    />
  );
}
