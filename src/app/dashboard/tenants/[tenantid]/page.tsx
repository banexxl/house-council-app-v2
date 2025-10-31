import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { redirect } from 'next/navigation';

import { Seo } from 'src/components/seo';
import { getAllBuildingsWithApartmentsForClient, readTenantByIdAction } from 'src/app/actions/tenant/tenant-actions';
import { getViewer } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { TenantForm } from 'src/app/dashboard/tenants/[tenantid]/tenant-form';

export default async function Page({ params }: {
  params: Promise<{ tenantid: string }>
}) {

  const { client, clientMember, tenant, admin } = await getViewer();
  const client_id = client ? client.id : clientMember ? clientMember.client_id : null;
  if (!client && !clientMember && !tenant && !admin) {
    logout();
  }

  const { tenantid } = await params;

  const [{ getTenantByIdActionSuccess, getTenantByIdActionData }, session, buildingsResult] = await Promise.all([
    readTenantByIdAction(tenantid),
    getViewer(),
    getAllBuildingsWithApartmentsForClient(client_id!),
  ]);

  const buildings = buildingsResult.success && buildingsResult.data ? buildingsResult.data : [];

  return (
    <>
      <Seo title="Dashboard: Tenant Edit" />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={4}>
            <TenantForm tenantData={getTenantByIdActionData} buildings={buildings} />
          </Stack>
        </Container>
      </Box>
    </>
  );
}
