'use server'

import { Box, Container, Stack, Typography } from "@mui/material"
import { createEntity, deleteEntity, updateEntity, readAllEntities, BaseEntity } from "src/app/actions/base-entity-services"
import GenericTableEditor from "src/sections/dashboard/client/client-components/client-components"

export default async function TableEditorPage() {

     const [
          readClientStatusesData,
          readClientTypesData,
          readClientBillingInformationStatusesData,
          readClientPaymentMethodsData,
          readFeatureStatusesData,
          readInvoiceStatusesData,
          readSubscriptionPlanStatusesData,
          readBuildingStatusesData,
     ] = await Promise.all([
          readAllEntities<BaseEntity>("tblClientStatuses"),
          readAllEntities<BaseEntity>("tblClientTypes"),
          readAllEntities<BaseEntity>("tblClientBillingInformationStatuses"),
          readAllEntities<BaseEntity>("tblClientPaymentMethods"),
          readAllEntities<BaseEntity>("tblFeatureStatuses"),
          readAllEntities<BaseEntity>("tblInvoiceStatuses"),
          readAllEntities<BaseEntity>("tblSubscriptionPlanStatuses"),
          readAllEntities<BaseEntity>("tblBuildingStatuses"),
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
                              clientPaymentMethods={readClientPaymentMethodsData}
                              clientBillingInformationStatuses={readClientBillingInformationStatusesData}
                              featureStatuses={readFeatureStatusesData}
                              invoiceStatuses={readInvoiceStatusesData}
                              subscriptionPlanStatuses={readSubscriptionPlanStatusesData}
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

