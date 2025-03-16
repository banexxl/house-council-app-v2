'use server'

import { Box, Container, Stack } from "@mui/material"
import { createEntity, deleteEntity, updateEntity, readAllEntities, BaseEntity } from "src/app/actions/base-entity-actions"
import GenericTableEditor from "src/sections/dashboard/client/client-components/client-components"

export default async function TableEditorPage() {

     const [
          readClientStatusesData,
          readClientTypesData,
          clientRolesData,
          readClientBillingInformationStatusesData,
          readClientPaymentMethodsData,
          readInvoiceStatusesData,
          readSubscriptionPlanStatusesData,
          readBuildingStatusesData,
          readFeaturesData,
     ] = await Promise.all([
          readAllEntities<BaseEntity>("tblClientStatuses"),
          readAllEntities<BaseEntity>("tblClientTypes"),
          readAllEntities<BaseEntity>("tblClientRoles"),
          readAllEntities<BaseEntity>("tblBillingInformationStatuses"),
          readAllEntities<BaseEntity>("tblPaymentMethods"),
          readAllEntities<BaseEntity>("tblInvoiceStatuses"),
          readAllEntities<BaseEntity>("tblSubscriptionPlanStatuses"),
          readAllEntities<BaseEntity>("tblBuildingStatuses"),
          readAllEntities<BaseEntity>("tblFeatures"),
     ]);


     return (
          <Box
               component="main"
               sx={{
                    flexGrow: 1,
                    py: 8,
               }}
          >
               <Container maxWidth="lg">
                    <Stack spacing={4}>
                         <GenericTableEditor
                              clientStatuses={readClientStatusesData}
                              clientTypes={readClientTypesData}
                              clientRoles={clientRolesData}
                              clientPaymentMethods={readClientPaymentMethodsData}
                              clientBillingInformationStatuses={readClientBillingInformationStatusesData}
                              invoiceStatuses={readInvoiceStatusesData}
                              subscriptionPlanStatuses={readSubscriptionPlanStatusesData}
                              features={readFeaturesData as BaseEntity[] & { base_price_per_month: number }[]}
                              buildingStatuses={readBuildingStatusesData}
                              updateEntity={updateEntity}
                              deleteEntity={deleteEntity}
                              createEntity={createEntity}
                         />
                    </Stack>
               </Container>
          </Box>
     )
}

