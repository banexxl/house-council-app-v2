import { Box, Card, Container, Stack, Typography } from "@mui/material";
import { readAllEntities } from "src/app/actions/base-entity-actions";
import SubscriptionEditor from "src/sections/dashboard/subscriptions/subscription-form";
import { BaseEntity, FeatureExtension } from "src/types/base-entity";


export default async function SubscriptionEditorPage() {

     const features = await readAllEntities<BaseEntity & FeatureExtension>('tblFeatures');
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
                         <SubscriptionEditor
                              features={features || []}
                              subscriptionStatuses={subscriptionStatuses || []}
                         />
                    </Stack>
               </Container>
          </Box>
     )
}

