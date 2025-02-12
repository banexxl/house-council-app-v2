import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import { ClientBillingInformationTableHeader } from 'src/sections/dashboard/client/billing-information/billing-information-table-header';
import BillingInformationTable from 'src/sections/dashboard/client/billing-information/billing-information-table';
import { ClientBillingInformation } from 'src/types/client-billing-information';
import { readAllClientBillingInformation } from 'src/app/actions/client-actions/client-billing-actions';


const Page = async () => {

  const { readAllClientBillingInformationData: clientPaymentMethods } = await readAllClientBillingInformation("tblClientPaymentMethods");

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
            <BillingInformationTable data={clientPaymentMethods || []} />
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default Page;
