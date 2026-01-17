import { Box, Container, Stack } from "@mui/material";
import { notFound } from "next/navigation";
// import { readSubscriptionPlan } from "src/app/actions/subscription-plan/subscription-plan-actions";
// import SubscriptionEditor from "src/sections/dashboard/subscriptions/subscription-form";

// Unified page: handles both existing subscription editing and new creation when param === 'new'
export default async function SubscriptionEditorPage({ params }: { params: Promise<{ subscription: string }> }) {
     // const { subscription } = await params;

     // let subscriptionPlan: any = null;
     // if (subscription && subscription !== 'new') {
     //      const { subscriptionPlan: plan } = await readSubscriptionPlan(subscription);
     //      subscriptionPlan = plan;
     //      if (!subscriptionPlan) {
     //           notFound();
     //      }
     // }

     return (
          <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
               <Container maxWidth="xl">
                    <Stack spacing={4}>
                         {/* <SubscriptionEditor
                              subscriptionPlansData={subscriptionPlan || undefined}
                         /> */}
                    </Stack>
               </Container>
          </Box>
     );
}

