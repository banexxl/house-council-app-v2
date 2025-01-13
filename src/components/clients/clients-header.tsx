'use client'

import ArrowLeftIcon from '@untitled-ui/icons-react/build/esm/ArrowLeft'
import Link from '@mui/material/Link'
import SvgIcon from '@mui/material/SvgIcon'
import Typography from '@mui/material/Typography'
import { RouterLink } from 'src/components/router-link'
import { paths } from 'src/paths'
import { useTranslation } from 'react-i18next'

export const ClientHeader = () => {

     const { t } = useTranslation()

     return (
          <div>
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
                         <ArrowLeftIcon />
                    </SvgIcon>
                    <Typography variant="subtitle2">{t('clients.clientsList')}</Typography>
               </Link>
          </div>
     )
}

