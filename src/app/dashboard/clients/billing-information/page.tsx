import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { ClientBillingInformationTableHeader } from 'src/sections/dashboard/client/billing-information/billing-information-table-header';
import BillingInformationTable from 'src/app/dashboard/clients/billing-information/billing-information';
import { readAllClientBillingInformation } from 'src/app/actions/client/client-billing-actions';
import { readAllClientsAction } from 'src/app/actions/client/client-actions';
import { checkIfUserExistsAndReturnDataAndSessionObject } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { redirect } from 'next/navigation';


const Page = async () => {

  const { client, tenant, admin } = await checkIfUserExistsAndReturnDataAndSessionObject();
  if (!client && !tenant && !admin) {
    logout()
  };

  if (tenant) {
    redirect('/dashboard/products');
  }

  if (client) {
    redirect('/dashboard/account');
  }


  const [
    { readAllClientBillingInformationData: clientBillingInfo },
    { getAllClientsActionData: clients },
  ] = await Promise.all([
    readAllClientBillingInformation(),
    readAllClientsAction(),
  ]);

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
          <ClientBillingInformationTableHeader />
          <BillingInformationTable
            data={clientBillingInfo || []}
            clients={clients || []}
          />
        </Stack>
      </Container>
    </Box>
  );
};

export default Page;
