import { Box, Card, Container, Stack, Typography } from "@mui/material";
import { SubscriptionTable } from "src/sections/dashboard/subscriptions/subscriptions-table";


const Page = async () => {

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
                         <SubscriptionTable />
                    </Stack>
               </Container>
          </Box>
     )
}

export default Page;

