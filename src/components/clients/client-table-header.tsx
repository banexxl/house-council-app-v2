'use client';

import { Button, Stack, SvgIcon, Typography } from '@mui/material';
import Upload01Icon from '@untitled-ui/icons-react/build/esm/Upload01';
import Download01Icon from '@untitled-ui/icons-react/build/esm/Download01';
import PlusIcon from '@untitled-ui/icons-react/build/esm/Plus';
import React from 'react';
import { paths } from 'src/paths';
import { useTranslation } from 'react-i18next';
import { exportToDocx } from 'src/utils/export-docx';
import { exportToPdf } from 'src/utils/export-pdf';

type ClientTableHeaderProps = {
     allClients: any; // Data to be exported
};

export const ClientTableHeader = (props: ClientTableHeaderProps) => {
     const { allClients } = props;
     const { t } = useTranslation();

     const handleExportDocx = () => {
          exportToDocx('clients_list', allClients);
     };

     const handleExportPdf = () => {
          exportToPdf('clients_list', allClients);
     };

     return (
          <Stack direction="row" justifyContent="space-between" spacing={4}>
               <Stack spacing={1}>
                    <Typography variant="h4">{t('clients.clientsList')}</Typography>
                    <Stack alignItems="center" direction="row" spacing={1}>
                         <Button
                              color="inherit"
                              size="small"
                              startIcon={
                                   <SvgIcon>
                                        <Upload01Icon />
                                   </SvgIcon>
                              }
                         >
                              {t('common.btnImport')}
                         </Button>
                         <Button
                              color="inherit"
                              size="small"
                              onClick={handleExportDocx}
                              startIcon={
                                   <SvgIcon>
                                        <Download01Icon />
                                   </SvgIcon>
                              }
                         >
                              {t('common.btnExportDocx')}
                         </Button>
                         <Button
                              color="inherit"
                              size="small"
                              onClick={handleExportPdf}
                              startIcon={
                                   <SvgIcon>
                                        <Download01Icon />
                                   </SvgIcon>
                              }
                         >
                              {t('common.btnExportPdf')}
                         </Button>
                    </Stack>
               </Stack>
               <Stack alignItems="center" direction="row" spacing={3}>
                    <Button
                         href={paths.dashboard.clients.new}
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
          </Stack>
     );
};
