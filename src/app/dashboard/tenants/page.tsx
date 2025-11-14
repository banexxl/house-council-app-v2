import { Container, Typography } from '@mui/material';
import { getAllTenantsFromClientsBuildings, getAllTenants } from 'src/app/actions/tenant/tenant-actions';
import { getViewer } from 'src/libs/supabase/server-auth';
import Tenants from './tenants';
import { redirect } from 'next/navigation';
import { logout } from 'src/app/auth/actions';


export default async function TenantsPage() {

  const { client, clientMember, tenant, admin } = await getViewer();
  const client_id = client ? client.id : clientMember ? clientMember.client_id : null;
  if (!client && !clientMember && !tenant && !admin) {
    logout();
  }


  let tenants: any[] = [];
  if (admin) {
    const { success, data } = await getAllTenants();
    tenants = Array.isArray(data) ? data : [];
  } else if (client || clientMember) {
    const { data } = await getAllTenantsFromClientsBuildings(client_id!);
    tenants = Array.isArray(data) ? data : [];
  } else if (tenant) {
    // Redirect tenant to products page
    redirect('/dashboard/social/profile');
  }

  return <Tenants tenants={tenants} />;
}
