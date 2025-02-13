'use client'

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from '@mui/material/Link'
import SvgIcon from '@mui/material/SvgIcon'
import Typography from '@mui/material/Typography'
import { RouterLink } from 'src/components/router-link'
import { paths } from 'src/paths'
import { useTranslation } from 'react-i18next'
import { Box } from '@mui/system'
import { Client } from 'src/types/client';

type ClientFormHeaderProps = {
     client?: Client
}

export const ClientFormHeader = (props: ClientFormHeaderProps) => {

     const { t } = useTranslation()

     return (
          <Box >
               <Link
                    color="text.primary"
                    component={RouterLink}
                    href={paths.dashboard.clients.index}
                    sx={{
                         alignItems: 'center',
                         display: 'inline-flex',
                    }}
                    underline="hover"
               >
                    <SvgIcon sx={{ mr: 1 }}>
                         <ArrowBackIcon />
                    </SvgIcon>
                    <Typography variant="subtitle2">{t('clients.clientsList')}</Typography>
               </Link>
               <Typography variant="h4" sx={{ mt: 2 }}>
                    {
                         props.client
                              ? t('clients.clientEdit') + ': ' + props.client.name
                              : t('clients.clientCreate')
                    }
               </Typography>
          </Box>
     )
}

