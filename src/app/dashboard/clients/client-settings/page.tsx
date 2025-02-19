'use server'

import { Box, Container, Stack, Typography } from "@mui/material"
import { deleteEntity, updateEntity } from "src/app/actions/base-entity-services"
import { readClientBillingInformationStatuses } from "src/app/actions/client-actions/client-billing-info-statuses"
import { readClientPaymentMethods } from "src/app/actions/client-actions/client-payment-methods"
import { readClientStatuses } from "src/app/actions/client-actions/client-status-actions"
import { readClientTypes } from "src/app/actions/client-actions/client-types-actions"
import GenericTableEditor from "src/sections/dashboard/client/client-components/client-components"

export default async function TableEditorPage() {

     const { readClientStatusesData } = await readClientStatuses()
     const { readClientTypesData } = await readClientTypes()
     const { readClientBillingInformationStatusesData } = await readClientBillingInformationStatuses()
     const { readClientPaymentMethodsData } = await readClientPaymentMethods()


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
                              updateEntity={updateEntity}
                              deleteEntity={deleteEntity}
                         />
                    </Stack>
               </Container>
          </Box>
     )
}

