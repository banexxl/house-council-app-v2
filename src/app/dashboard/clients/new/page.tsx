import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'

import { Seo } from 'src/components/seo'
import { NewClientHeader } from 'src/components/clients/clients-header'
import { fetchClientTypes } from 'src/services/client-types-services'

import { ClientStatus, ClientType } from 'src/types/client'
import { ClientNewForm } from 'src/sections/dashboard/client/client-new-form'
import { fetchClientStatuses } from 'src/services/client-statuses-services'

const Page = async () => {

  const clientTypes: ClientType[] = await fetchClientTypes()
  const clientStatuses: ClientStatus[] = await fetchClientStatuses()

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
            <ClientNewForm clientTypes={clientTypes} clientStatuses={clientStatuses} />
          </Stack>
        </Container>
      </Box>
    </>
  )
}

export default Page

