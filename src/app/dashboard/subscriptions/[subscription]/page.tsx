import { Box, Container, Stack } from "@mui/material";
import { notFound } from "next/navigation";
import { readAllEntities } from "src/app/actions/base-entity-actions";
import { readSubscriptionPlan } from "src/app/actions/subscription-plan/subscription-plan-actions";
import SubscriptionEditor from "src/sections/dashboard/subscriptions/subscription-form";
import { BaseEntity, FeatureExtension } from "src/types/base-entity";


export default async function SubscriptionEditorPage({ params }: any) {

     const features = await readAllEntities<BaseEntity & FeatureExtension>('tblFeatures')

     const { subscription } = await params;


     const { readSubscriptionPlanSuccess, subscriptionPlan, readSubscriptionPlanError } = await readSubscriptionPlan(subscription);

     if (!subscriptionPlan) {
          notFound();
     }

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
                              subscriptionPlansData={subscriptionPlan}
                         />
                    </Stack>
               </Container>
          </Box>
     )
}

