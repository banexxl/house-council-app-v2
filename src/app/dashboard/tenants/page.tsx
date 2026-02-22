import { getAllTenantsFromCustomersBuildings, getAllTenants } from 'src/app/actions/tenant/tenant-actions';
import { getViewer } from 'src/libs/supabase/server-auth';
import Tenants from './tenants';
import { redirect } from 'next/navigation';
import { paths } from 'src/paths';
import { Card, Container } from '@mui/material';


export default async function TenantsPage() {

  const { customer, tenant, admin, userData } = await getViewer();
  const customerId = customer?.id ?? null;
  if (!customer && !tenant && !admin) {
    redirect(paths.auth.login);
  }
  let tenants: any[] = [];
  if (admin) {
    const { success, data } = await getAllTenants();
    tenants = Array.isArray(data) ? data : [];
  } else if (customer) {
    const { data } = await getAllTenantsFromCustomersBuildings(customerId!);
    tenants = Array.isArray(data) ? data : [];
  } else if (tenant) {
    // Redirect tenant to products page
    redirect('/dashboard/social/profile');
  }

  return (
    <Container maxWidth="xl">
      <Card sx={{ p: 2 }}>
        <Tenants tenants={tenants} />
      </Card>
    </Container>
  );
}
