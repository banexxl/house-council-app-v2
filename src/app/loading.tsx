import { Box, Stack, Typography } from "@mui/material";
import Layout from "./auth/layout";

export default function Loading() {
     // Or a custom loading skeleton component
     return (
          <Layout>
               <Box
                    sx={{
                         width: "100%",
                         height: "100vh",
                         display: "flex",
                         justifyContent: "center",
                         alignItems: "center"
                    }}
               >
                    <Stack
                         direction="column"
                         alignItems="center"
                         spacing={2}
                    >
                         <Typography variant="h2" gutterBottom>
                              Page is loading...
                         </Typography>
                         <Box
                              sx={{
                                   display: "flex",
                                   justifyContent: "center",
                                   alignItems: "center",
                                   width: "50px",
                                   height: "50px",
                                   borderRadius: "50%",
                                   border: "2px solid #e5e5e5",
                                   borderTopColor: "#333"
                              }}
                              className="animate-spin"
                         />
                    </Stack>
               </Box>
          </Layout>
     )
}