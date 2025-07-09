import { Box, Card, Container, Stack, Typography } from "@mui/material";
import { Suspense } from "react";
import { readAllEntities } from "src/app/actions/base-entity-actions";
import { readAllSubscriptionPlans } from "src/app/actions/subscription-plans/subscription-plan-actions";
import Loading from "src/app/loading";
import { SubscriptionTable } from "src/sections/dashboard/subscriptions/subscriptions-table";
import { BaseEntity } from "src/types/base-entity";


export default async function Page() {

     const subscriptionPlans = await readAllSubscriptionPlans();
     const subscriptionPlanStatuses = await readAllEntities<BaseEntity>('tblSubscriptionPlanStatuses');

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
                         <Suspense fallback={<Loading />}>
                              <SubscriptionTable subscriptionPlans={subscriptionPlans.subscriptionPlanData} subscriptionPlanStatuses={subscriptionPlanStatuses} />
                         </Suspense>
                    </Stack>
               </Container>
          </Box>
     )
}

