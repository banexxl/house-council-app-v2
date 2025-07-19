'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from '@mui/material/Link';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import { useTranslation } from 'react-i18next';
import { Box } from '@mui/system';
import { Tenant } from 'src/types/tenant';

type TenantFormHeaderProps = {
     tenant?: Tenant;
};

export const TenantFormHeader = ({ tenant }: TenantFormHeaderProps) => {
     const { t } = useTranslation();

     return (
          <Box>
               <Link
                    color="text.primary"
                    component={RouterLink}
                    href={paths.dashboard.tenants.index}
                    sx={{
                         alignItems: 'center',
                         display: 'inline-flex',
                    }}
                    underline="hover"
               >
                    <SvgIcon sx={{ mr: 1 }}>
                         <ArrowBackIcon />
                    </SvgIcon>
                    <Typography variant="subtitle2">{t('tenants.tenantsList')}</Typography>
               </Link>
               <Typography variant="h4" sx={{ mt: 2 }}>
                    {tenant
                         ? `${t('tenants.tenantEdit')}: ${tenant.first_name} ${tenant.last_name}`
                         : t('tenants.tenantCreate')}
               </Typography>
          </Box>
     );
};
