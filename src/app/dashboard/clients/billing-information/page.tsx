import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import { ClientBillingInformationTableHeader } from 'src/sections/dashboard/client/billing-information/billing-information-table-header';
import BillingInformationTable from 'src/sections/dashboard/client/billing-information/billing-information-table';
import { ClientBillingInformation } from 'src/types/client-billing-information';
import { readAllClientBillingInformation } from 'src/app/actions/client-actions/client-billing-actions';
import { BaseEntity, readAllEntities } from 'src/app/actions/base-entity-services';
import { readAllClientsAction } from 'src/app/actions/client-actions/client-actions';


const Page = async () => {

  const { readAllClientBillingInformationData: clientPaymentMethods } = await readAllClientBillingInformation("tblClientPaymentMethods");

  const paymentMethods = await readAllEntities<BaseEntity>("tblClientPaymentMethods")

  const billingInfoStatuses = await readAllEntities<BaseEntity>("tblClientBillingInformationStatuses")

  const { getAllClientsActionData: clients } = await readAllClientsAction();

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
            data={clientPaymentMethods || []}
            paymentMethods={paymentMethods}
            billingInfoStatuses={billingInfoStatuses}
            clients={clients || []}
          />
        </Stack>
      </Container>
    </Box>
  );
};

export default Page;
