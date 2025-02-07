import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'

import { Seo } from 'src/components/seo'
import { NewClientHeader } from 'src/sections/dashboard/client/clients-header'
import { fetchClientTypes } from 'src/services/client-types-services'

import { ClientStatus, ClientType } from 'src/types/client'
import { fetchClientStatuses } from 'src/services/client-statuses-services'
import { getClientByIdAction } from 'src/app/actions/client-actions/client-actions'
import { ClientForm } from 'src/sections/dashboard/client/client-form'
import { readAllPaymentMethods } from 'src/services/base-entity-services'
import { ClientPaymentMethod } from 'src/types/payment-method'

const Page = async ({ params }: any) => {

  const clientTypes: ClientType[] = await fetchClientTypes()
  const clientStatuses: ClientStatus[] = await fetchClientStatuses()
  const clientPaymentMethods: ClientPaymentMethod[] = await readAllPaymentMethods()
  const { clientid } = await params

  const { getClientByIdActionSuccess, getClientByIdActionData, getClientByIdActionError } = await getClientByIdAction(clientid)

  return (
    <>
      <Seo title="Dashboard: Client Edit" />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={4}>
            <NewClientHeader />
            <ClientForm clientTypes={clientTypes} clientStatuses={clientStatuses} clientData={getClientByIdActionData} clientPaymentMethods={clientPaymentMethods} />
          </Stack>
        </Container>
      </Box>
    </>
  )
}

export default Page

