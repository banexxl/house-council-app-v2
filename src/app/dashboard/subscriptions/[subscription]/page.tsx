import { Box, Container, Stack } from "@mui/material";
import { BaseEntity, readAllEntities } from "src/app/actions/base-entity-actions";
import { readSubscriptionPlan } from "src/app/actions/subscription-plans/subscription-plan-actions";
import SubscriptionEditor from "src/sections/dashboard/subscriptions/subscription-form";


export default async function SubscriptionEditorPage({ params }: any) {

     const features = await readAllEntities<BaseEntity & { base_price_per_month: number }>('tblFeatures')
     const subscriptionStatuses = await readAllEntities<BaseEntity>('tblSubscriptionPlanStatuses');

     const { subscription } = await params;

     const { readSubscriptionPlanSuccess, subscriptionPlan, readSubscriptionPlanError } = await readSubscriptionPlan(subscription);

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
                         <SubscriptionEditor
                              features={features || []}
                              subscriptionStatuses={subscriptionStatuses || []}
                              subscriptionPlanData={subscriptionPlan}
                         />
                    </Stack>
               </Container>
          </Box>
     )
}

