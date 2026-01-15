import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { redirect } from 'next/navigation';

import { Seo } from 'src/components/seo';
import { getAllBuildingsWithApartmentsForClient, readTenantByIdAction } from 'src/app/actions/tenant/tenant-actions';
import { getViewer } from 'src/libs/supabase/server-auth';
import { TenantForm } from 'src/app/dashboard/tenants/[tenantid]/tenant-form';

export default async function Page({ params }: {
  params: Promise<{ tenantid: string }>
}) {

  const { customer, tenant, admin } = await getViewer();
  const customerId = customer?.id ?? null;
  if (!customer && !tenant && !admin) {
    redirect('/auth/login');
  }

  const { tenantid } = await params;

  const [{ getTenantByIdActionSuccess, getTenantByIdActionData }, session, buildingsResult] = await Promise.all([
    readTenantByIdAction(tenantid),
    getViewer(),
    getAllBuildingsWithApartmentsForClient(customerId!),
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
