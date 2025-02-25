import { Box, Card, Container, Stack, Typography } from "@mui/material";
import { BaseEntity, readAllEntities } from "src/app/actions/base-entity-actions";
import { createSubscriptionPlan } from "src/app/actions/subscription-plans/subscription-plan-actions";
import SubscriptionEditor from "src/sections/dashboard/subscriptions/subscription-form";


export default async function SubscriptionEditorPage() {

     const features = await readAllEntities<BaseEntity>('tblFeatures');
     const subscriptionStatuses = await readAllEntities<BaseEntity>('tblSubscriptionPlanStatuses');

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
                         <Typography variant="h4" sx={{ ontWeight: 'bold', mb: 6 }}>Subscription Editor</Typography>
                         <SubscriptionEditor
                              features={features || []}
                              subscriptionStatuses={subscriptionStatuses || []}
                              createSubscriptionPlan={createSubscriptionPlan}
                         />
                    </Stack>
               </Container>
          </Box>
     )
}

