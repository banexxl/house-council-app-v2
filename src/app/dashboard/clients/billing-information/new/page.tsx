import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import { ClientBillingInformationForm } from 'src/sections/dashboard/client/billing-information/billing-information-form';
import { readAllClientsAction } from 'src/app/actions/client/client-actions';
import { readAllEntities } from 'src/app/actions/base-entity-actions';
import { BillingInfoFormHeader } from 'src/sections/dashboard/client/billing-information/billing-information-form-header';
import { BaseEntity } from 'src/types/base-entity';
import { checkIfUserExistsAndReturnDataAndSessionObject } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { redirect } from 'next/navigation';

const Page = async () => {

  const { client } = await checkIfUserExistsAndReturnDataAndSessionObject();
  if (!client) {
    logout()
    redirect('/auth/login')
  };

  const clientPaymentMethods = await readAllEntities<BaseEntity>("tblPaymentMethods")
  const billingInformationStatuses = await readAllEntities<BaseEntity>("tblBillingInformationStatuses")
  const allClients = await readAllClientsAction()

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
          <ClientBillingInformationForm allClients={allClients.getAllClientsActionData?.length != 0 ? allClients.getAllClientsActionData! : []} clientPaymentMethods={clientPaymentMethods} billingInformationStatuses={billingInformationStatuses} />
        </Stack>
      </Container>
    </Box>
  );
};

export default Page;
