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
     Typography
} from '@mui/material';

import { BreadcrumbsSeparator } from 'src/components/breadcrumbs-separator';
import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import { useTranslation } from 'react-i18next';
import { type Tenant } from 'src/types/tenant';
import { TenantListTable } from 'src/sections/dashboard/tenant/tanant-list-table';
import { FilterSearch } from 'src/components/filter-list-search';

type TenantFilters = {
     name: string;
     email: string;
};

export interface TenantSearchState {
     filters: TenantFilters;
     page: number;
     rowsPerPage: number;
}

const useTenantsSearch = () => {
     const [state, setState] = useState<TenantSearchState>({
          filters: {
               name: '',
               email: '',
          },
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
          const { name, email } = tenantsSearch.state.filters;

          return tenants.filter((tenant) => {
               const fullName = `${tenant.first_name} ${tenant.last_name}`.toLowerCase();
               const matchesName = name ? fullName.includes(name.toLowerCase()) : true;
               const matchesEmail = email ? tenant.email?.toLowerCase().includes(email.toLowerCase()) : true;
               return matchesName && matchesEmail;
          });
     }, [tenants, tenantsSearch.state.filters]);

     const paginatedTenants = useMemo(() => {
          const start = tenantsSearch.state.page * tenantsSearch.state.rowsPerPage;
          const end = start + tenantsSearch.state.rowsPerPage;
          return filteredTenants.slice(start, end);

     }, [filteredTenants, tenantsSearch.state.page, tenantsSearch.state.rowsPerPage]);

     const handleTenantFilters = useCallback((filters: Record<string, any>) => {
          const mappedFilters: TenantFilters = {
               name: filters.name || '',
               email: filters.email || '',
          };
          tenantsSearch.handleFiltersChange(mappedFilters);
     }, [tenantsSearch]);

     return (
          <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
               <Container maxWidth="xl">
                    <Stack spacing={4}>
                         <Stack direction="row" justifyContent="space-between" spacing={4}>
                              <Stack spacing={1}>
                                   <Typography variant="h4">{t('tenants.tenantList')}</Typography>
                                   <Breadcrumbs separator={<BreadcrumbsSeparator />}>
                                        <Link color="text.primary" component={RouterLink} href={paths.dashboard.index} variant="subtitle2">
                                             {t('nav.adminDashboard')}
                                        </Link>
                                        <Typography color="text.secondary" variant="subtitle2">
                                             {t('tenants.tenantList')}
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
                              <FilterSearch
                                   resourceBase="tenants"
                                   filtersConfig={[
                                        {
                                             type: 'text&select',
                                             field: 'name',
                                             label: 'lblTenantName',
                                             placeholder: 'filterSearchByName',
                                        },
                                        {
                                             type: 'select',
                                             field: 'tenant_types',
                                             label: 'lblTenantType',
                                             options: [
                                                  { value: 'owner', label: 'tenantTypeOwner' },
                                                  { value: 'renter', label: 'tenantTypeRenter' },
                                             ],
                                        },
                                        {
                                             type: 'select',
                                             field: 'is_primary',
                                             label: 'lblIsPrimary',
                                             options: [
                                                  { value: 'true', label: 'common.lblYes' },
                                                  { value: 'false', label: 'common.lblNo' },
                                             ],
                                             single: true,
                                        },
                                   ]}
                                   onFiltersChange={handleTenantFilters}
                              />
                              <TenantListTable
                                   items={paginatedTenants}
                                   count={filteredTenants.length}
                                   page={tenantsSearch.state.page}
                                   rowsPerPage={tenantsSearch.state.rowsPerPage}
                                   onPageChange={tenantsSearch.handlePageChange}
                                   onRowsPerPageChange={tenantsSearch.handleRowsPerPageChange}
                              />
                         </Card>
                    </Stack>
               </Container>
          </Box>
     );
};

export default Tenants;
