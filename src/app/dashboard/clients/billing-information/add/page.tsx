import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import { ClientBillingInformationTableHeader } from 'src/sections/dashboard/client/billing-information/billing-information-table-header';
import ClientPaymentTypeInfo from 'src/sections/dashboard/client/billing-information/payment-methods';
import { fetchClientPaymentMethods } from 'src/services/client-payment-method-services';
import { fetchAllClients } from 'src/services/client-services';


const Page = async () => {

  const clientPaymentMethods = await fetchClientPaymentMethods()
  const allClients = await fetchAllClients()

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
          <Card>
            <ClientPaymentTypeInfo allClients={allClients} clientPaymentMethods={clientPaymentMethods} />
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default Page;
