'use server'

import { getAllAddedLocationsByClientId, getAllLocations } from 'src/app/actions/location/location-services';
import { getViewer } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { redirect } from 'next/navigation';
import Locations from './locations';
import { BuildingLocation } from 'src/types/location';

const Page = async () => {

  const { customer, tenant, admin } = await getViewer();
  if (!customer && !tenant && !admin) {
    redirect('/auth/login');
  }

  let locations: BuildingLocation[] = [];
  if (admin) {
    const { success, data } = await getAllLocations();
    locations = success && data ? data : [];
  } else if (customer) {
    const { data } = await getAllAddedLocationsByClientId(customer.id);
    locations = data ?? [];
  } else if (tenant) {
    locations = [];
    redirect('/dashboard/social/profile');
  }

  return (
    <Locations locations={locations} />
  );
};

export default Page;
