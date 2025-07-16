import { Backdrop, CircularProgress, Typography, Stack } from "@mui/material";

export default function Loading() {
     return (
          <Backdrop
               open={true}
               sx={{
                    color: "#fff",
                    zIndex: 1301, // static value instead of (theme) => theme.zIndex.modal + 1
                    backdropFilter: "blur(4px)",
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
               }}
          >
               <Stack direction="column" alignItems="center" spacing={2}>
                    <Typography variant="h6" color="white">
                         Page is loading...
                    </Typography>
                    <CircularProgress color="inherit" />
               </Stack>
          </Backdrop>
     );
}
