import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'

import { Seo } from 'src/components/seo'
import { ClientFormHeader } from 'src/sections/dashboard/client/clients-header'
import { ClientForm } from 'src/sections/dashboard/client/client-form'
import { BaseEntity, readAllEntities } from 'src/app/actions/base-entity-actions'

const Page = async () => {

  const [
    clientTypes,
    clientStatuses,
    clientPaymentMethods,
    clientRoles,
  ] = await Promise.all([
    readAllEntities<BaseEntity>("tblClientTypes"),
    readAllEntities<BaseEntity>("tblClientStatuses"),
    readAllEntities<BaseEntity>("tblClientPaymentMethods"),
    readAllEntities<BaseEntity>("tblClientRoles"),
  ])

  return (
    <>
      <Seo title="Dashboard: Client New" />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={4}>
            <ClientFormHeader />
            <ClientForm
              clientTypes={clientTypes}
              clientStatuses={clientStatuses.length != 0 ? clientStatuses! : []}
              clientPaymentMethods={clientPaymentMethods}
              clientRoles={clientRoles}
            />
          </Stack>
        </Container>
      </Box>
    </>
  )
}

export default Page

