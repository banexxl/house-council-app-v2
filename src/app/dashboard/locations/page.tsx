'use server'

import { getAllAddedLocationsByClientId, getAllLocations } from 'src/app/actions/location/location-services';
import { getViewer } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { redirect } from 'next/navigation';
import Locations from './locations';
import { BuildingLocation } from 'src/types/location';
import { Card, Container } from '@mui/material';

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
    <Container maxWidth="xl">
      <Card sx={{ p: 2 }}>
        <Locations locations={locations} />
      </Card>
    </Container>
  );
};

export default Page;
