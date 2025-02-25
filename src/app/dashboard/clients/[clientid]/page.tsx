import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'

import { Seo } from 'src/components/seo'
import { ClientFormHeader } from 'src/sections/dashboard/client/clients-header'
import { readClientByIdAction } from 'src/app/actions/client-actions/client-actions'
import { ClientForm } from 'src/sections/dashboard/client/client-form'
import { BaseEntity, readAllEntities } from 'src/app/actions/base-entity-actions'

const Page = async ({ params }: any) => {

  const [clientTypes, clientStatuses, clientPaymentMethods] = await Promise.all([
    readAllEntities<BaseEntity>("tblClientTypes"),
    readAllEntities<BaseEntity>("tblClientStatuses"),
    readAllEntities<BaseEntity>("tblClientPaymentMethods"),
  ])
  const { clientid } = await params

  const { getClientByIdActionSuccess, getClientByIdActionData, getClientByIdActionError } = await readClientByIdAction(clientid)

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
            <ClientFormHeader client={getClientByIdActionData} />
            <ClientForm clientTypes={clientTypes} clientStatuses={clientStatuses?.length != 0 ? clientStatuses! : []} clientData={getClientByIdActionData} clientPaymentMethods={clientPaymentMethods} />
          </Stack>
        </Container>
      </Box>
    </>
  )
}

export default Page

