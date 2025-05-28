import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { ClientBillingInformationTableHeader } from 'src/sections/dashboard/client/billing-information/billing-information-table-header';
import BillingInformationTable from 'src/sections/dashboard/client/billing-information/billing-information-table';
import { readAllClientBillingInformation } from 'src/app/actions/client-actions/client-billing-actions';
import { readAllEntities } from 'src/app/actions/base-entity-actions';
import { readAllClientsAction } from 'src/app/actions/client-actions/client-actions';
import { BaseEntity } from 'src/types/base-entity';


const Page = async () => {

  const [
    { readAllClientBillingInformationData: clientBillingInfo },
    paymentMethods,
    billingInfoStatuses,
    { getAllClientsActionData: clients },
  ] = await Promise.all([
    readAllClientBillingInformation(),
    readAllEntities<BaseEntity>("tblPaymentMethods"),
    readAllEntities<BaseEntity>("tblBillingInformationStatuses"),
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
