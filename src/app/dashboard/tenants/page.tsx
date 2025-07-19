import { Container, Typography, Box } from '@mui/material';
import { getAllBuildingsFromClient } from 'src/app/actions/building/building-actions';
import { getAllTenantsFromClientsBuildings } from 'src/app/actions/tenant/tenant-actions';
import { checkIfUserExistsAndReturnDataAndSessionObject } from 'src/libs/supabase/server-auth';
import { TenantListTable } from 'src/sections/dashboard/tenant/tanant-list-table';
import Tenants from './tenants';

export default async function TenantsPage() {

  const { client, userData, error } = await checkIfUserExistsAndReturnDataAndSessionObject();

  if (error || !client) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h6" color="error">
          {error ?? 'Unauthorized access'}
        </Typography>
      </Container>
    );
  }

  const [tenantResult] = await Promise.all([
    getAllTenantsFromClientsBuildings(client.id),
  ]);

  if (!tenantResult.success) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h6" color="error">
          Failed to load tenants or buildings: {tenantResult.error}
        </Typography>
      </Container>
    );
  }

  return (
    <Tenants tenants={tenantResult.data ?? []} />
  );
}
