import { Box, Container, Stack, Card } from "@mui/material";
// import { readAllSubscriptionPlans } from "src/app/actions/subscription-plan/subscription-plan-actions";
// import { SubscriptionTable } from "src/sections/dashboard/subscriptions/subscriptions-table";
import { getViewer } from "src/libs/supabase/server-auth";
import { redirect } from "next/navigation";

export default async function Page() {

     const { customer, tenant, admin } = await getViewer();
     if (!customer && !tenant && !admin) {
          redirect('/auth/login');
     }

     // const subscriptionPlans = await readAllSubscriptionPlans();

     return (
          <Container maxWidth="xl">
               <Card sx={{ p: 2 }}>
                    <Card>
                         {/* <SubscriptionTable
                                   subscriptionPlans={subscriptionPlans.subscriptionPlansData}
                              /> */}
                    </Card>
               </Card>
          </Container>
     )
}

