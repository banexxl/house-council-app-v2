import { getViewer } from 'src/libs/supabase/server-auth';
import { ClientFileManagerPage } from './client-page';
import { logout } from 'src/app/auth/actions';
import { redirect } from 'next/navigation';

const Page = async () => {

  const { client, tenant, admin, clientMember, userData } = await getViewer();

  if (!client && !tenant && !admin && !clientMember) {
    logout();
  }

  if (!client && !clientMember) {
    redirect('/dashboard');
  }

  const userId = userData?.id ?? '';

  return <ClientFileManagerPage userId={userId} />;
};

export default Page;
