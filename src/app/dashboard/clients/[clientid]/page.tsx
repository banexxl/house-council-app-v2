import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'

import { Seo } from 'src/components/seo'
import { NewClientHeader } from 'src/sections/dashboard/client/clients-header'
import { fetchClientTypes } from 'src/app/actions/client-actions/client-types-actions'

import { ClientStatus, ClientType } from 'src/types/client'
import { getClientByIdAction } from 'src/app/actions/client-actions/client-actions'
import { ClientForm } from 'src/sections/dashboard/client/client-form'
import { BaseEntity, readAllEntities } from 'src/app/actions/base-entity-services'
import { readClientStatuses } from 'src/app/actions/client-actions/client-status-actions'

const Page = async ({ params }: any) => {

  const clientTypes: ClientType[] = await fetchClientTypes()
  const clientStatuses = await readClientStatuses()
  const clientPaymentMethods: BaseEntity[] = await readAllEntities<BaseEntity>("tblClientPaymentMethods")
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
            <ClientForm clientTypes={clientTypes} clientStatuses={clientStatuses.readClientStatusesData?.length != 0 ? clientStatuses.readClientStatusesData! : []} clientData={getClientByIdActionData} clientPaymentMethods={clientPaymentMethods} />
          </Stack>
        </Container>
      </Box>
    </>
  )
}

export default Page

