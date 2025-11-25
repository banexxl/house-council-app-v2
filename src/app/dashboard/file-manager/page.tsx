import { getViewer } from 'src/libs/supabase/server-auth';
import { ClientFileManagerPage } from './client-page';
import { logout } from 'src/app/auth/actions';
import { redirect } from 'next/navigation';

const Page = async () => {

  const { client, tenant, admin, clientMember } = await getViewer();

  if (!client && !tenant && !admin && !clientMember) {
    logout();
  }

  if (!client && !clientMember) {
    redirect('/dashboard');
  }

  const clientId = client?.id ?? clientMember?.client_id ?? '';

  return <ClientFileManagerPage clientId={clientId} />;
};

export default Page;
