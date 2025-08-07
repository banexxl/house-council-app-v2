import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'

import { Seo } from 'src/components/seo'
import { ClientFormHeader } from 'src/sections/dashboard/client/clients-header'
import { readClientByIdAction } from 'src/app/actions/client/client-actions'
import { ClientForm } from 'src/sections/dashboard/client/client-form'
import { checkIfUserExistsAndReturnDataAndSessionObject } from 'src/libs/supabase/server-auth'
import { logout } from 'src/app/auth/actions'
import { redirect } from 'next/navigation'

export default async function Page({ params }: {
  params: Promise<{ clientid: string }>
}) {

  const { client, tenant, admin } = await checkIfUserExistsAndReturnDataAndSessionObject();

  if (!admin || tenant || client) {
    logout()
  };

  if (client) {
    redirect('/dashboard/account');
  }

  if (tenant) {
    redirect('/dashboard/products');
  }

  const { clientid } = await params
  const [{ getClientByIdActionSuccess, getClientByIdActionData, getClientByIdActionError }] = await Promise.all([
    readClientByIdAction(clientid),
  ]);

  return (
    <>
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
            <ClientForm clientData={getClientByIdActionData} showAdvancedSettings showClientActions />
          </Stack>
        </Container>
      </Box>
    </>
  )
}