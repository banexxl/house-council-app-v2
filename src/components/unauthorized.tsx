'use client';

import { Container, Typography, Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { tokens } from "src/locales/tokens";

export const Unauthorized = () => {

     const { t } = useTranslation();

     return (
          <Container maxWidth="sm" sx={{ mt: 8 }}>
               <Box textAlign="center">
                    <Typography variant="h3" color="error" sx={{ mb: 2 }}>
                         {t(tokens.errors.unauthorized.header)}
                    </Typography>
                    <Typography variant="h5" color="text.secondary" sx={{ mb: 2 }}>
                         {t(tokens.errors.unauthorized.subheader)}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                         {t(tokens.errors.unauthorized.description)}
                    </Typography>
               </Box>
          </Container>
     );
};
