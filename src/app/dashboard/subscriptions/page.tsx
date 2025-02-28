import { Box, Card, Container, Stack, Typography } from "@mui/material";
import { readAllSubscriptionPlans } from "src/app/actions/subscription-plans/subscription-plan-actions";
import { SubscriptionTable } from "src/sections/dashboard/subscriptions/subscriptions-table";


export default async function Page() {

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
                         <Typography variant="h4" sx={{ ontWeight: 'bold', mb: 6 }}>Subscription Editor</Typography>
                         <SubscriptionTable subscriptionPlans={subscriptionPlans.subscriptionPlanData} />
                    </Stack>
               </Container>
          </Box>
     )
}

