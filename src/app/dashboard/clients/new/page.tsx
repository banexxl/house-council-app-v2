import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'

import { Seo } from 'src/components/seo'
import { ClientHeader } from 'src/components/clients/clients-header'
import { fetchClientTypes } from 'src/services/client-types-services'

import { ClientType } from 'src/types/client'
import { ClientNewForm } from 'src/sections/dashboard/client/client-new-form'

const Page = async () => {

  const clientTypes: ClientType[] = await fetchClientTypes()

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
            <ClientNewForm clientTypes={clientTypes} />
          </Stack>
        </Container>
      </Box>
    </>
  )
}

export default Page

