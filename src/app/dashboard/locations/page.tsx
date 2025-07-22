'use server'

import { getAllAddedLocationsByClientId } from 'src/app/actions/location/location-services';
import { checkIfUserExistsAndReturnDataAndSessionObject } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { redirect } from 'next/navigation';
import Locations from './locations';

const Page = async () => {

  const { client } = await checkIfUserExistsAndReturnDataAndSessionObject();
  if (!client) {
    logout()
    redirect('/auth/login')
  };

  const { data } = await getAllAddedLocationsByClientId(client?.id!);

  return (
    <Locations locations={data ?? []} />
  );
};

export default Page;
