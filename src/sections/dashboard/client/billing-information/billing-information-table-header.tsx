'use client';

import { Stack, Typography } from '@mui/material';

import React from 'react';
import { useTranslation } from 'react-i18next';

export const ClientBillingInformationTableHeader = () => {

     const { t } = useTranslation();

     return (
          <Stack direction="row" justifyContent="space-between" spacing={4}>
               <Stack spacing={1}>
                    <Typography variant="h4">{t('clients.clientBillingInformation')}</Typography>
               </Stack>
               <Stack alignItems="center" direction="row" spacing={3}>
               </Stack>
          </Stack>
     );
};
