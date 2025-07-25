import { Container, Typography } from '@mui/material';
import { getAllTenantsFromClientsBuildings, getAllTenants } from 'src/app/actions/tenant/tenant-actions';
import { checkIfUserExistsAndReturnDataAndSessionObject } from 'src/libs/supabase/server-auth';
import Tenants from './tenants';


export default async function TenantsPage() {
  const { client, tenant, admin } = await checkIfUserExistsAndReturnDataAndSessionObject();
  if (!client && !tenant && !admin) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h6" color="error">
          Unauthorized access
        </Typography>
      </Container>
    );
  }

  let tenants: any[] = [];
  if (admin) {
    const { success, data } = await getAllTenants();
    tenants = Array.isArray(data) ? data : [];
  } else if (client && 'id' in client) {
    const { data } = await getAllTenantsFromClientsBuildings((client as { id: string }).id);
    tenants = Array.isArray(data) ? data : [];
  } else if (tenant) {
    tenants = [];
  }

  return <Tenants tenants={tenants} />;
}
