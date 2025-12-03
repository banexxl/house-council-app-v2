// src/sections/common/not-found-client.tsx
'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles/createTheme';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { paths } from 'src/paths';

export function NotFoundClient() {
     const isMdDown = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
     const { t } = useTranslation();
     const [loading, setLoading] = useState(false);
     const router = useRouter();

     return (
          <Box
               component="main"
               sx={{
                    alignItems: 'center',
                    display: 'flex',
                    flexGrow: 1,
                    py: '80px',
               }}
          >
               <Container maxWidth="lg">
                    <Box
                         sx={{
                              display: 'flex',
                              justifyContent: 'center',
                              mb: 6,
                         }}
                    >
                         <Box
                              alt={t('errors.page.notFound')}
                              component="img"
                              src="/assets/errors/error-404.png"
                              sx={{
                                   height: 'auto',
                                   maxWidth: '100%',
                                   width: 400,
                              }}
                         />
                    </Box>

                    <Typography align="center" variant={isMdDown ? 'h4' : 'h1'}>
                         404: {t('errors.page.notFoundDescriptionShort')}
                    </Typography>

                    <Typography
                         align="center"
                         color="text.secondary"
                         sx={{ mt: 0.5 }}
                    >
                         {t('errors.page.notFoundDescription')}
                    </Typography>

                    <Box
                         sx={{
                              display: 'flex',
                              justifyContent: 'center',
                              mt: 6,
                         }}
                    >
                         <Button
                              onClick={() => {
                                   router.push(paths.index);
                                   setLoading(true);
                              }}
                              disabled={loading}
                         >
                              {t('common.btnBackHome')}
                         </Button>
                    </Box>
               </Container>
          </Box>
     );
}
