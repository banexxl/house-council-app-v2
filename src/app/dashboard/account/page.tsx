

import { readClientByIdAction } from 'src/app/actions/client/client-actions';
import Account from './account';
import { checkIfUserExistsAndReturnDataAndSessionObject } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { redirect } from 'next/navigation';
import { Client } from 'src/types/client';

interface PageProps {
  searchParams?: { id?: string };
}


const Page = async ({ searchParams }: PageProps) => {
  let clientData: Client | null = null;
  const { client, tenant, admin } = await checkIfUserExistsAndReturnDataAndSessionObject();
  if (!client && !tenant && !admin) {
    logout();
    return null;
  }

  if (client) {
    const { getClientByIdActionSuccess, getClientByIdActionData } = await readClientByIdAction(client.id);
    if (getClientByIdActionSuccess && getClientByIdActionData) {
      clientData = getClientByIdActionData;
    }
  } else if (admin && searchParams?.id) {
    //TODO: we do not have a client id in the URL when logged in as admin
    const { getClientByIdActionSuccess, getClientByIdActionData } = await readClientByIdAction(searchParams.id);
    if (getClientByIdActionSuccess && getClientByIdActionData) {
      clientData = getClientByIdActionData;
    }
  } else if (tenant) {
    redirect('/dashboard/products');
  }

  return <Account client={clientData!} />;
};

export default Page;
