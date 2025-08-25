'use client';

import { useCallback, useState } from 'react';
import PlusIcon from '@untitled-ui/icons-react/build/esm/Plus';
import {
     Box,
     Breadcrumbs,
     Button,
     Card,
     Container,
     Link,
     Stack,
     SvgIcon,
     Typography,
} from '@mui/material';

import { BreadcrumbsSeparator } from 'src/components/breadcrumbs-separator';
import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import { useTranslation } from 'react-i18next';
import { type Tenant } from 'src/types/tenant';
import { GenericTable } from 'src/components/generic-table';
import { deleteTenantByIDAction } from 'src/app/actions/tenant/tenant-actions';
import toast from 'react-hot-toast';


interface TenantsProps {
     tenants: Tenant[];
}

const Tenants = ({ tenants }: TenantsProps) => {
     const { t } = useTranslation();
     const [addTenantLoading, setAddTenantLoading] = useState(false);

     const handleDeleteConfirm = useCallback(async (tenantId: string) => {
          const deleteTenantResponse = await deleteTenantByIDAction(tenantId);
          if (deleteTenantResponse.deleteTenantByIDActionSuccess) {
               toast.success(t('common.actionDeleteSuccess'));
          } else {
               toast.error(t('common.actionDeleteError'));
          }
     }, [t]);

     return (
          <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
               <Container maxWidth="xl">
                    <Stack spacing={4}>
                         <Stack direction="row" justifyContent="space-between" spacing={4}>
                              <Stack spacing={1}>
                                   <Typography variant="h4">{t('tenants.tenantsList')}</Typography>
                                   <Breadcrumbs separator={<BreadcrumbsSeparator />}>
                                        <Link color="text.primary" component={RouterLink} href={paths.dashboard.index} variant="subtitle2">
                                             {t('nav.adminDashboard')}
                                        </Link>
                                        <Typography color="text.secondary" variant="subtitle2">
                                             {t('tenants.tenantsList')}
                                        </Typography>
                                   </Breadcrumbs>
                              </Stack>
                              <Button
                                   sx={{ height: 40 }}
                                   component={RouterLink}
                                   href={paths.dashboard.tenants.new}
                                   onClick={() => setAddTenantLoading(true)}
                                   startIcon={<SvgIcon><PlusIcon /></SvgIcon>}
                                   variant="contained"
                                   loading={addTenantLoading}
                              >
                                   {t('common.btnCreate')}
                              </Button>
                         </Stack>

                         <Card>
                              <GenericTable<Tenant>
                                   items={tenants}
                                   baseUrl="/dashboard/tenants"
                                   columns={[
                                        {
                                             key: 'first_name',
                                             label: t('tenants.firstName'),
                                             render: (_, tenant) => `${tenant.first_name} ${tenant.last_name}`
                                        },
                                        {
                                             key: 'email',
                                             label: t('tenants.email')
                                        },
                                        {
                                             key: 'phone_number',
                                             label: t('tenants.tenantPhoneNumber')
                                        },
                                        {
                                             key: 'tenant_type',
                                             label: t('tenants.tenantType'),
                                             render: (val) => t(`tenants.lbl${(val as string).charAt(0).toUpperCase() + (val as string).slice(1)}`)
                                        },
                                        {
                                             key: 'is_primary',
                                             label: t('tenants.tenantIsPrimary'),
                                             render: (val) => val ? t('common.lblYes') : t('common.lblNo')
                                        }
                                   ]}
                                   rowActions={[
                                        (tenant, openActionDialog) => (
                                             <Button
                                                  color="error"
                                                  variant="outlined"
                                                  size="small"
                                                  onClick={() => openActionDialog({
                                                       id: tenant.id,
                                                       title: t('warning.deleteWarningTitle'),
                                                       message: t('warning.deleteWarningMessage'),
                                                       confirmText: t('common.btnDelete'),
                                                       cancelText: t('common.btnClose'),
                                                       onConfirm: () => deleteTenantByIDAction(tenant.id)
                                                  })}
                                             >
                                                  {t('common.btnDelete')}
                                             </Button>
                                        )
                                   ]}
                              />
                         </Card>
                    </Stack>
               </Container>
          </Box>
     );
};

export default Tenants;
