import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { redirect } from 'next/navigation';

import { Seo } from 'src/components/seo';
import { getAllBuildingsWithApartmentsForClient, readTenantByIdAction } from 'src/app/actions/tenant/tenant-actions';
import { getViewer } from 'src/libs/supabase/server-auth';
import { TenantForm } from 'src/app/dashboard/tenants/[tenantid]/tenant-form';
import { Card } from '@mui/material';

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
    <Container maxWidth="xl">
      <Card sx={{ p: 2 }}>
        <TenantForm tenantData={getTenantByIdActionData} buildings={buildings} />
      </Card>
    </Container>
  );
}
