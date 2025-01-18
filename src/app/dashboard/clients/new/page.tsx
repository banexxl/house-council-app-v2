import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'

import { Seo } from 'src/components/seo'
import { ClientHeader } from 'src/components/clients/clients-header'
import { fetchClientStatuses, fetchClientTypes } from 'src/services/client-types-services'

import { ClientStatus, ClientType } from 'src/types/client'
import { ClientNewForm } from 'src/sections/dashboard/client/client-new-form'

const Page = async () => {

  const clientTypes: ClientType[] = await fetchClientTypes()
  const clientStatuses: ClientStatus[] = await fetchClientStatuses()

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
            <ClientHeader />
            <ClientNewForm clientTypes={clientTypes} clientStatuses={clientStatuses} />
          </Stack>
        </Container>
      </Box>
    </>
  )
}

export default Page

