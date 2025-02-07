import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import { ClientBillingInformationTableHeader } from 'src/sections/dashboard/client/billing-information/billing-information-table-header';
import { ClientBillingInformationForm } from 'src/sections/dashboard/client/billing-information/billingInformation-form';
import { BaseEntity, readAllEntities } from 'src/services/base-entity-services';
import { fetchAllClients } from 'src/services/client-services';


const Page = async () => {

  const clientPaymentMethods = await readAllEntities<BaseEntity>("tblClientPaymentMethods")
  const billingInformationStatuses = await readAllEntities<BaseEntity>("tblClientBillingInformationStatuses")
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
            <ClientBillingInformationForm allClients={allClients} clientPaymentMethods={clientPaymentMethods} billingInformationStatuses={billingInformationStatuses} />
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default Page;
