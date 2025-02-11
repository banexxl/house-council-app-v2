import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import { ClientBillingInformationTableHeader } from 'src/sections/dashboard/client/billing-information/billing-information-table-header';
import { ClientBillingInformationForm } from 'src/sections/dashboard/client/billing-information/billingInformation-form';
import { readAllClientsAction } from 'src/app/actions/client-actions/client-actions';
import { BaseEntity, readAllEntities } from 'src/app/actions/base-entity-services';
import { readClientBillingInformation } from 'src/app/actions/client-actions/client-billing-actions';

const Page = async ({ params }: any) => {

  const clientPaymentMethods = await readAllEntities<BaseEntity>("tblClientPaymentMethods")
  const billingInformationStatuses = await readAllEntities<BaseEntity>("tblClientBillingInformationStatuses")
  const allClients = await readAllClientsAction()
  const { billingInformationId } = await params
  const { readClientBillingInformationData } = await readClientBillingInformation(billingInformationId)
  const billingInformationStatus = billingInformationStatuses.find((status) => status.id === readClientBillingInformationData?.billing_status_id)
  const clientPaymentMethod = clientPaymentMethods.find((method) => method.id === readClientBillingInformationData?.payment_method_id)

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
            <ClientBillingInformationForm allClients={allClients.getAllClientsActionData?.length != 0 ? allClients.getAllClientsActionData! : []} clientPaymentMethod={{ value: clientPaymentMethod?.id || "", name: clientPaymentMethod?.name || "" }} clientBillingInformationStatus={{ value: billingInformationStatus?.id || "", name: billingInformationStatus?.name || "" }} clientPaymentMethods={clientPaymentMethods} billingInformationStatuses={billingInformationStatuses} billingInformationData={readClientBillingInformationData} />
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default Page;
