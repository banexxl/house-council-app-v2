import { Container, Typography, Box } from '@mui/material';
import { getAllTenantsFromClientsBuildings } from 'src/app/actions/tenant/tenant-actions';
import { checkIfUserExistsAndReturnDataAndSessionObject } from 'src/libs/supabase/server-auth';
import { TenantListTable } from 'src/sections/dashboard/tenant/tanant-table';

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

  const result = await getAllTenantsFromClientsBuildings(client.id);

  if (!result.success) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h6" color="error">
          Failed to load tenants: {result.error}
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Tenants
      </Typography>

      <Box mt={3}>
        <TenantListTable items={result.data ?? []} />
      </Box>
    </Container>
  );
}
