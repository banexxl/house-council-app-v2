import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { redirect } from 'next/navigation';

import { Seo } from 'src/components/seo';
import { readTenantByIdAction } from 'src/app/actions/tenant/tenant-actions';
import { checkIfUserExistsAndReturnDataAndSessionObject } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { TenantFormHeader } from 'src/sections/dashboard/tenant/tenant-header';
import { TenantForm } from 'src/sections/dashboard/tenant/tenant-form';

export default async function Page({ params }: { params: { tenantid: string } }) {
  const { client } = await checkIfUserExistsAndReturnDataAndSessionObject();
  if (!client) {
    logout();
    redirect('/auth/login');
  }

  const { tenantid } = params;

  const [{ getTenantByIdActionSuccess, getTenantByIdActionData }, _session] = await Promise.all([
    readTenantByIdAction(tenantid),
    checkIfUserExistsAndReturnDataAndSessionObject(),
  ]);

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
            <TenantFormHeader tenant={getTenantByIdActionData} />
            <TenantForm tenantData={getTenantByIdActionData} />
          </Stack>
        </Container>
      </Box>
    </>
  );
}
