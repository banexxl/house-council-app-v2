'use client';

import type { ChangeEvent, MouseEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
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
import { SearchAndBooleanFilters } from 'src/components/filter-list-search';
import { GenericTable } from 'src/components/table';
import { deleteTenantByIDAction } from 'src/app/actions/tenant/tenant-actions';
import toast from 'react-hot-toast';

export type TenantFilters = {
     search?: string;
     is_primary?: boolean;
     tenant_type?: string;
};

export interface TenantSearchState {
     filters: TenantFilters;
     page: number;
     rowsPerPage: number;
}

const useTenantsSearch = () => {
     const [state, setState] = useState<TenantSearchState>({
          filters: {},
          page: 0,
          rowsPerPage: 5,
     });

     const handleFiltersChange = useCallback((filters: TenantFilters): void => {
          setState((prev) => ({ ...prev, filters, page: 0 }));
     }, []);

     const handlePageChange = useCallback((_event: MouseEvent<HTMLButtonElement> | null, page: number): void => {
          setState((prev) => ({ ...prev, page }));
     }, []);

     const handleRowsPerPageChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
          setState((prev) => ({
               ...prev,
               rowsPerPage: parseInt(event.target.value, 10),
               page: 0,
          }));
     }, []);

     return { state, handleFiltersChange, handlePageChange, handleRowsPerPageChange };
};

interface TenantsProps {
     tenants: Tenant[];
}

const Tenants = ({ tenants }: TenantsProps) => {
     const { t } = useTranslation();
     const tenantsSearch = useTenantsSearch();
     const [addTenantLoading, setAddTenantLoading] = useState(false);

     const filteredTenants = useMemo(() => {
          const { search, is_primary, tenant_type } = tenantsSearch.state.filters;

          return tenants.filter((tenant) => {
               const fullName = `${tenant.first_name} ${tenant.last_name}`.toLowerCase();
               const matchesSearch = search
                    ? fullName.includes(search.toLowerCase()) || tenant.email?.toLowerCase().includes(search.toLowerCase())
                    : true;

               const matchesType = tenant_type ? tenant.tenant_type === tenant_type : true;
               const matchesPrimary = typeof is_primary === 'boolean' ? tenant.is_primary === is_primary : true;

               return matchesSearch && matchesType && matchesPrimary;
          });
     }, [tenants, tenantsSearch.state.filters]);

     const paginatedTenants = useMemo(() => {
          const start = tenantsSearch.state.page * tenantsSearch.state.rowsPerPage;
          const end = start + tenantsSearch.state.rowsPerPage;
          return filteredTenants.slice(start, end);
     }, [filteredTenants, tenantsSearch.state.page, tenantsSearch.state.rowsPerPage]);

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
                              <SearchAndBooleanFilters
                                   value={tenantsSearch.state.filters}
                                   onChange={tenantsSearch.handleFiltersChange}
                                   fields={[
                                        { field: 'is_primary', label: 'tenants.tenantIsPrimary' }
                                   ]}
                              />
                              <GenericTable<Tenant>
                                   items={paginatedTenants}
                                   count={filteredTenants.length}
                                   page={tenantsSearch.state.page}
                                   rowsPerPage={tenantsSearch.state.rowsPerPage}
                                   onPageChange={tenantsSearch.handlePageChange}
                                   onRowsPerPageChange={tenantsSearch.handleRowsPerPageChange}
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
                                   handleDeleteConfirm={({ id }) => {
                                        handleDeleteConfirm(id);
                                   }}
                              />
                         </Card>
                    </Stack>
               </Container>
          </Box>
     );
};

export default Tenants;
