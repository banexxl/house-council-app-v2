import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import { ClientBillingInformationForm } from 'src/sections/dashboard/client/billing-information/billing-information-form';
import { readAllClientsAction } from 'src/app/actions/client-actions/client-actions';
import { BaseEntity, readAllEntities } from 'src/app/actions/base-entity-actions';
import { BillingInfoFormHeader } from 'src/sections/dashboard/client/billing-information/billing-information-form-header';

const Page = async () => {

  const clientPaymentMethods = await readAllEntities<BaseEntity>("tblClientPaymentMethods")
  const billingInformationStatuses = await readAllEntities<BaseEntity>("tblClientBillingInformationStatuses")
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
