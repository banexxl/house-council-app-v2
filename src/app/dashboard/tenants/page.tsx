import { Container, Typography } from '@mui/material';
import { getAllTenantsFromClientsBuildings, getAllTenants } from 'src/app/actions/tenant/tenant-actions';
import { getViewer } from 'src/libs/supabase/server-auth';
import Tenants from './tenants';
import { redirect } from 'next/navigation';
import { logout } from 'src/app/auth/actions';


export default async function TenantsPage() {

  const { client, clientMember, tenant, admin } = await getViewer();

  if (!client && !clientMember && !tenant && !admin) {
    logout();
  }


  let tenants: any[] = [];
  if (admin) {
    const { success, data } = await getAllTenants();
    tenants = Array.isArray(data) ? data : [];
  } else if (client && 'id' in client) {
    const { data } = await getAllTenantsFromClientsBuildings((client as { id: string }).id);
    tenants = Array.isArray(data) ? data : [];
  } else if (tenant) {
    // Redirect tenant to products page
    redirect('/dashboard/products');
  }

  return <Tenants tenants={tenants} />;
}
