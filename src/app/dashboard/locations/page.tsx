'use server'

import { getAllAddedLocationsByClientId, getAllLocations } from 'src/app/actions/location/location-services';
import { checkIfUserExistsAndReturnDataAndSessionObject } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { redirect } from 'next/navigation';
import Locations from './locations';

const Page = async () => {

  const { client, tenant, admin } = await checkIfUserExistsAndReturnDataAndSessionObject();
  if (!client && !tenant && !admin) {
    logout();
    redirect('/auth/login');
  }

  let locations = [];
  if (admin) {
    const { success, data } = await getAllLocations();
    locations = success && data ? data : [];
  } else if (client) {
    const { data } = await getAllAddedLocationsByClientId(client.id);
    locations = data ?? [];
  } else if (tenant) {
    locations = [];
  }

  return (
    <Locations locations={locations} />
  );
};

export default Page;
