import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { ClientBillingInformationForm } from 'src/sections/dashboard/client/billing-information/billing-information-form';
import { readAllClientsAction } from 'src/app/actions/client/client-actions';
import { readAllEntities } from 'src/app/actions/base-entity-actions';
import { readClientBillingInformation } from 'src/app/actions/client/client-billing-actions';
import { BillingInfoFormHeader } from 'src/sections/dashboard/client/billing-information/billing-information-form-header';
import { BaseEntity } from 'src/types/base-entity';
import { checkIfUserExistsAndReturnDataAndSessionObject } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { redirect } from 'next/navigation';

const Page = async ({ params }: any) => {

  const { client, tenant, admin } = await checkIfUserExistsAndReturnDataAndSessionObject();
  if (!client && !tenant && !admin) {
    logout()
    redirect('/auth/login')
  };

  const allClients = await readAllClientsAction()
  const { billingInformationId } = await params
  const { readClientBillingInformationData } = await readClientBillingInformation(billingInformationId)

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        py: 8,
      }}
    >
      <Container maxWidth="xl">
        <Stack spacing={4}>
          <BillingInfoFormHeader />
          <ClientBillingInformationForm
            allClients={allClients.getAllClientsActionData?.length != 0 ? allClients.getAllClientsActionData! : []}
            billingInformationData={readClientBillingInformationData} />
        </Stack>
      </Container>
    </Box>
  );
};

export default Page;
