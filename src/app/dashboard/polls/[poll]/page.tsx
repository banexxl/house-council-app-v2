import { redirect } from 'next/navigation';
import { getViewer } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { getAllBuildings, getAllBuildingsFromClient } from 'src/app/actions/building/building-actions';
import { getPollById } from 'src/app/actions/poll/polls';
import { getPollOptions } from 'src/app/actions/poll/poll-options';
import { getAttachments } from 'src/app/actions/poll/poll-attachments';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { toStorageRef } from 'src/utils/sb-bucket';
import PollCreate from './poll-create';
import log from 'src/utils/logger';

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
  const [{ data: pollRes }, { data: optionsRes }, { data: attachmentsRes }] = await Promise.all([
    getPollById(idOrCreate),
    getPollOptions(idOrCreate),
    getAttachments(idOrCreate),
  ]);

  // Sign attachment URLs for display
  let attachmentsSigned: { url: string; name?: string }[] = [];
  try {
    const supabase = await useServerSideSupabaseAnonClient();
    const bucketDefault = process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;
    const refs = (attachmentsRes || []).map(a => {
      const ref = toStorageRef((a as any).file_url) ?? { bucket: bucketDefault, path: (a as any).file_url as string };
      return { bucket: ref.bucket, path: ref.path, name: (a as any).title as string | undefined };
    });
    // Group by bucket and sign
    const byBucket = new Map<string, { path: string; name?: string }[]>();
    refs.forEach(r => {
      const arr = byBucket.get(r.bucket) ?? [];
      arr.push({ path: r.path, name: r.name });
      byBucket.set(r.bucket, arr);
    });
    const out: { url: string; name?: string }[] = [];
    for (const [bucket, items] of byBucket) {
      const { data } = await supabase.storage.from(bucket).createSignedUrls(items.map(i => i.path), 60 * 60);
      (data || []).forEach((d, i) => {
        if (d?.signedUrl) out.push({ url: d.signedUrl, name: items[i].name });
      });
    }
    attachmentsSigned = out;
  } catch { }

  return (
    <PollCreate
      buildings={buildings}
      clientId={client_id || ''}
      poll={pollRes}
      options={optionsRes}
      attachments={attachmentsRes}
      attachmentsSigned={attachmentsSigned}
    />
  );
}
