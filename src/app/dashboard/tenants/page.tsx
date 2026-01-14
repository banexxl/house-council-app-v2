import { Container, Typography } from '@mui/material';
import { getAllTenantsFromClientsBuildings, getAllTenants } from 'src/app/actions/tenant/tenant-actions';
import { getViewer } from 'src/libs/supabase/server-auth';
import Tenants from './tenants';
import { redirect } from 'next/navigation';
import { logout } from 'src/app/auth/actions';
import { paths } from 'src/paths';


export default async function TenantsPage() {

  const { customer, tenant, admin, userData } = await getViewer();
  const customerId = client ? client.id : clientMember ? clientMember.customerId : null;
  if (!client && !clientMember && !tenant && !admin) {
    redirect(paths.auth.login);
  }
  let tenants: any[] = [];
  if (admin) {
    const { success, data } = await getAllTenants();
    tenants = Array.isArray(data) ? data : [];
  } else if (client || clientMember) {
    const { data } = await getAllTenantsFromClientsBuildings(customerId!);
    tenants = Array.isArray(data) ? data : [];
  } else if (tenant) {
    // Redirect tenant to products page
    redirect('/dashboard/social/profile');
  }

  return <Tenants tenants={tenants} />;
}
