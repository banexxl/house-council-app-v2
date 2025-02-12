'use client';

import { Box, Link, Stack, SvgIcon, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';

export const ClientBillingInformationTableHeader = () => {

     const { t } = useTranslation();

     return (
          <Stack direction="row" justifyContent="space-between" spacing={4}>
               <Stack spacing={1}>
                    <Box >
                         <Link
                              color="text.primary"
                              component={RouterLink}
                              href={paths.dashboard.clients.billingInformation.index}
                              sx={{
                                   alignItems: 'center',
                                   display: 'inline-flex',
                              }}
                              underline="hover"
                         >
                              <SvgIcon sx={{ mr: 1 }}>
                                   <ArrowBackIcon />
                              </SvgIcon>
                              <Typography variant="subtitle2">{t('clients.clientPaymentMethods')}</Typography>
                         </Link>
                    </Box>
               </Stack>
               <Stack alignItems="center" direction="row" spacing={3}>
               </Stack>
          </Stack>
     );
};
