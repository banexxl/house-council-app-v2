import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'

import { ClientFormHeader } from 'src/sections/dashboard/client/clients-header'
import { readClientByIdAction } from 'src/app/actions/client/client-actions'
import { ClientForm } from 'src/sections/dashboard/client/client-form'
import { getViewer } from 'src/libs/supabase/server-auth'
import { logout } from 'src/app/auth/actions'
import { ClientSubscription, SubscriptionPlan } from 'src/types/subscription-plan'
import { readAllSubscriptionPlans, readClientSubscriptionPlanFromClientId } from 'src/app/actions/subscription-plan/subscription-plan-actions'

export default async function Page({ params }: {
  params: Promise<{ clientid: string }>
}) {

  const { clientid } = await params

  const { client, clientMember, tenant, admin, userData } = await getViewer();

  let clientSubscription: ClientSubscription & { subscription_plan: SubscriptionPlan } | null
  let availableSubscriptions: SubscriptionPlan[] = []

  // Only admin can access this page
  if (!admin || tenant || client || clientMember) {
    logout()
  };

  if (admin) {
    const [clientSubscriptionResult, availableSubscriptionsResult] = await Promise.all([
      readClientSubscriptionPlanFromClientId(clientid),
      readAllSubscriptionPlans()
    ]);
    clientSubscription = clientSubscriptionResult.clientSubscriptionPlanData ?? null;
    availableSubscriptions = availableSubscriptionsResult.subscriptionPlansData ?? [];
  }

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
            <ClientForm
              clientData={getClientByIdActionData}
              clientSubscription={clientSubscription!}
              availableSubscriptions={availableSubscriptions}
              showAdvancedSettings
              showClientActions
            />
          </Stack>
        </Container>
      </Box>
    </>
  )
}