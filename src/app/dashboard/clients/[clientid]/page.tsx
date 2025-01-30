import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'

import { Seo } from 'src/components/seo'
import { NewClientHeader } from 'src/components/clients/clients-header'
import { fetchClientTypes } from 'src/services/client-types-services'

import { ClientStatus, ClientType } from 'src/types/client'
import { ClientNewForm } from 'src/sections/dashboard/client/client-new-form'
import { fetchClientStatuses } from 'src/services/client-statuses-services'
import { getClientByIdAction } from 'src/app/actions/client-actions/client-actions'

const Page = async ({ params }: any) => {

  const clientTypes: ClientType[] = await fetchClientTypes()
  const clientStatuses: ClientStatus[] = await fetchClientStatuses()
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
            <ClientNewForm clientTypes={clientTypes} clientStatuses={clientStatuses} clientData={getClientByIdActionData} />
          </Stack>
        </Container>
      </Box>
    </>
  )
}

export default Page

