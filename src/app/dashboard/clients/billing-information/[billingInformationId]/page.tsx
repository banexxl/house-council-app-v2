import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import { ClientBillingInformationTableHeader } from 'src/sections/dashboard/client/billing-information/billing-information-table-header';
import { ClientBillingInformationForm } from 'src/sections/dashboard/client/billing-information/billingInformation-form';
import { getAllClientsAction } from 'src/app/actions/client-actions/client-actions';
import { BaseEntity, readAllEntities } from 'src/app/actions/base-entity-services';

const Page = async ({ params }: any) => {

  const clientPaymentMethods = await readAllEntities<BaseEntity>("tblClientPaymentMethods")
  const billingInformationStatuses = await readAllEntities<BaseEntity>("tblClientBillingInformationStatuses")
  const allClients = await getAllClientsAction()
  const { billingInformationId } = await params
  console.log('billingInformationId', billingInformationId);


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
            <ClientBillingInformationForm allClients={allClients.getAllClientsActionData?.length != 0 ? allClients.getAllClientsActionData! : []} clientPaymentMethods={clientPaymentMethods} billingInformationStatuses={billingInformationStatuses} />
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default Page;
