'use client';

import { Box, Button, Link, Stack, SvgIcon, Typography } from '@mui/material';
import PlusIcon from '@mui/icons-material/Add';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { paths } from 'src/paths';

export const ClientBillingInformationTableHeader = () => {

     const { t } = useTranslation();

     return (
          <Stack direction="row" justifyContent="space-between" spacing={4}>
               <Typography variant="h4">{t('clients.clientPaymentMethods')}</Typography>
               <Stack spacing={1}>
                    <Box >
                         <Stack alignItems="center" direction="row" spacing={3}>
                              <Button
                                   href={paths.dashboard.clients.billingInformation.add}
                                   startIcon={
                                        <SvgIcon>
                                             <PlusIcon />
                                        </SvgIcon>
                                   }
                                   variant="contained"
                              >
                                   {t('common.btnCreate')}
                              </Button>
                         </Stack>
                    </Box>
               </Stack>
               <Stack alignItems="center" direction="row" spacing={3}>
               </Stack>
          </Stack>
     );
};
