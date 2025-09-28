'use server'

import { getAllAddedLocationsByClientId, getAllLocations } from 'src/app/actions/location/location-services';
import { getViewer } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { redirect } from 'next/navigation';
import Locations from './locations';
import { readClientFromClientMemberID } from 'src/app/actions/client/client-members';

const Page = async () => {

  const { client, clientMember, tenant, admin } = await getViewer();
  if (!client && !clientMember && !tenant && !admin) {
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
  } else if (clientMember) {
    const { success, data } = await readClientFromClientMemberID(clientMember.id);
    const { success: success2, data: data2 } = await getAllAddedLocationsByClientId(data!.id);
    locations = success2 ? data2! : [];
  } else if (tenant) {
    locations = [];
  }

  return (
    <Locations locations={locations} />
  );
};

export default Page;
