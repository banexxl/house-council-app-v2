import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'

import { Seo } from 'src/components/seo'
import { ClientFormHeader } from 'src/sections/dashboard/client/clients-header'
import { readClientByIdAction } from 'src/app/actions/client/client-actions'
import { ClientForm } from 'src/sections/dashboard/client/client-form'
import { checkIfUserIsLoggedInAndReturnUserData } from 'src/libs/supabase/server-auth'

export default async function Page({ params }: {
  params: Promise<{ clientid: string }>
}) {


  const { clientid } = await params
  const [{ getClientByIdActionSuccess, getClientByIdActionData, getClientByIdActionError }, userSession] = await Promise.all([
    readClientByIdAction(clientid),
    checkIfUserIsLoggedInAndReturnUserData(),
  ]);

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
            <ClientForm clientData={getClientByIdActionData} />
          </Stack>
        </Container>
      </Box>
    </>
  )
}