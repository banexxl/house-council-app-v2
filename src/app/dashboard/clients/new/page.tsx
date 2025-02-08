import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'

import { Seo } from 'src/components/seo'
import { NewClientHeader } from 'src/sections/dashboard/client/clients-header'
import { fetchClientTypes } from 'src/services/client-types-services'

import { ClientStatus, ClientType } from 'src/types/client'
import { fetchClientStatuses } from 'src/services/client-statuses-services'
import { ClientForm } from 'src/sections/dashboard/client/client-form'
import { BaseEntity, readAllEntities } from 'src/services/base-entity-services'

const Page = async () => {

  const clientTypes: ClientType[] = await fetchClientTypes()
  const clientStatuses: ClientStatus[] = await fetchClientStatuses()
  const clientPaymentMethods: BaseEntity[] = await readAllEntities<BaseEntity>("tblClientPaymentMethods")


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
            <NewClientHeader />
            <ClientForm clientTypes={clientTypes} clientStatuses={clientStatuses} clientPaymentMethods={clientPaymentMethods} />
          </Stack>
        </Container>
      </Box>
    </>
  )
}

export default Page

