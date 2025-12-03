import { Box, Container, Stack, Card } from "@mui/material";
import { readAllSubscriptionPlans } from "src/app/actions/subscription-plan/subscription-plan-actions";
import { SubscriptionTable } from "src/sections/dashboard/subscriptions/subscriptions-table";
import { getViewer } from "src/libs/supabase/server-auth";
import { logout } from "src/app/auth/actions";
import { redirect } from "next/navigation";

export default async function Page() {

     const { client, clientMember, tenant, admin } = await getViewer();
     if (!client && !clientMember && !tenant && !admin) {
          redirect('/auth/login');
     }

     const subscriptionPlans = await readAllSubscriptionPlans();

     return (
          <Box
               component="main"
               sx={{
                    flexGrow: 1,
                    py: 8,
               }}
          >
               <Container maxWidth="xl">
                    <Stack spacing={4}>
                         <Card>
                              <SubscriptionTable
                                   subscriptionPlans={subscriptionPlans.subscriptionPlansData}
                              />
                         </Card>
                    </Stack>
               </Container>
          </Box>
     )
}

