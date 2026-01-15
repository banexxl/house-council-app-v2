import { getViewer } from 'src/libs/supabase/server-auth';
import { ClientFileManagerPage } from './client-page';
import { redirect } from 'next/navigation';

const Page = async () => {

  const { customer, tenant, admin, userData } = await getViewer();

  if (!customer && !tenant && !admin) {
    redirect('/auth/login');
  }

  const userId = userData?.id ?? '';

  return <ClientFileManagerPage userId={userId} />;
};

export default Page;
