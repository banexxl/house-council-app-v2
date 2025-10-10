import { Box, Container, Stack } from "@mui/material";
import { notFound } from "next/navigation";
import { readAllEntities } from "src/app/actions/base-entity-actions";
import { readSubscriptionPlan } from "src/app/actions/subscription-plan/subscription-plan-actions";
import SubscriptionEditor from "src/sections/dashboard/subscriptions/subscription-form";
import { BaseEntity, FeatureExtension } from "src/types/base-entity";

// Unified page: handles both existing subscription editing and new creation when param === 'new'
export default async function SubscriptionEditorPage({ params }: { params: Promise<{ subscription: string }> }) {
     const { subscription } = await params;

     const features = await readAllEntities<BaseEntity & FeatureExtension>('tblFeatures');

     let subscriptionPlan: any = null;
     if (subscription && subscription !== 'new') {
          const { subscriptionPlan: plan } = await readSubscriptionPlan(subscription);
          subscriptionPlan = plan;
          if (!subscriptionPlan) {
               notFound();
          }
     }

     return (
          <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
               <Container maxWidth="xl">
                    <Stack spacing={4}>
                         <SubscriptionEditor
                              features={features || []}
                              subscriptionPlansData={subscriptionPlan || undefined}
                         />
                    </Stack>
               </Container>
          </Box>
     );
}

