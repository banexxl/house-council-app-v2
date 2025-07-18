'use client';

import { useCallback, useMemo, useState, type ChangeEvent, type FC } from 'react';
import PropTypes from 'prop-types';
import {
     Avatar,
     Box,
     Button,
     Checkbox,
     Link,
     Stack,
     SvgIcon,
     Table,
     TableBody,
     TableCell,
     TableHead,
     TablePagination,
     TableRow,
     Typography,
     Paper,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Cancel as CancelIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';

import { Scrollbar } from 'src/components/scrollbar';
import { paths } from 'src/paths';
import { useSelection } from 'src/hooks/use-selection';
import { useDialog } from 'src/hooks/use-dialog';
import { PopupModal } from 'src/components/modal-dialog';
import { applySort } from 'src/utils/apply-sort';
import { getInitials } from 'src/utils/get-initials';
import { deleteTenantByIDsAction } from 'src/app/actions/tenant/tenant-actions';
import { type Tenant } from 'src/types/tenant';
import { FilterBar } from '../client/table-filter';

interface TenantListTableProps {
     items?: (Tenant & {
          apartment?: {
               apartment_number?: string;
               building?: {
                    street_address?: string;
                    city?: string;
               };
          };
     })[];
}

export const TenantListTable: FC<TenantListTableProps> = ({ items = [] }) => {
     const [count, setCount] = useState(items.length);
     const tenantIds = useMemo(() => items.map((tenant) => tenant.id), [items]);
     const tenantSelection = useSelection(tenantIds);
     const selectedSome = tenantSelection.selected.length > 0 && tenantSelection.selected.length < tenantIds.length;
     const selectedAll = items.length > 0 && tenantSelection.selected.length === tenantIds.length;
     const enableBulkActions = tenantSelection.selected.length > 0;
     const router = useRouter();

     const deleteTenantsDialog = useDialog<{ tenantIds: string[] }>();
     const { t } = useTranslation();

     const [state, setState] = useState({
          query: '',
          page: 0,
          rowsPerPage: 5,
          sortBy: 'updated_at' as keyof Tenant,
          sortDir: 'desc' as 'asc' | 'desc',
     });

     const handleQueryChange = useCallback((filters: Partial<typeof state>) => {
          setState((prev) => ({ ...prev, ...filters }));
     }, []);

     const handlePageChange = useCallback((_event: any, page: number) => {
          setState((prev) => ({ ...prev, page }));
     }, []);

     const handleRowsPerPageChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
          setState((prev) => ({
               ...prev,
               page: 0,
               rowsPerPage: parseInt(event.target.value, 10),
          }));
     }, []);

     const handleSortChange = useCallback((sortBy: keyof Tenant, sortDir: 'asc' | 'desc') => {
          setState((prev) => ({ ...prev, sortBy, sortDir }));
     }, []);

     const handleDeleteTenantsConfirm = useCallback(async () => {
          deleteTenantsDialog.handleClose();
          const res = await deleteTenantByIDsAction(tenantSelection.selected);
          if (res.deleteTenantByIDsActionSuccess) {
               tenantSelection.handleDeselectAll();
          }
     }, [deleteTenantsDialog, tenantSelection.selected]);

     const visibleRows = useMemo(() => {
          const filtered = items.filter((tenant) => {
               return !state.query ||
                    tenant.first_name.toLowerCase().includes(state.query.toLowerCase()) ||
                    tenant.last_name.toLowerCase().includes(state.query.toLowerCase()) ||
                    tenant.email?.toLowerCase().includes(state.query.toLowerCase());
          });

          setCount(filtered.length);

          return applySort(filtered, state.sortBy, state.sortDir).slice(
               state.page * state.rowsPerPage,
               state.page * state.rowsPerPage + state.rowsPerPage
          );
     }, [items, state]);

     return (
          <Box sx={{ position: 'relative' }}>
               <FilterBar
                    onFiltersChange={handleQueryChange}
                    onSortChange={handleSortChange}
                    sortBy={state.sortBy}
                    sortDir={state.sortDir}
                    sortOptions={[
                         { label: 'Last Name', value: 'last_name' },
                         { label: 'Email', value: 'email' },
                         { label: 'Move-in Date', value: 'move_in_date' },
                         { label: 'Updated At', value: 'updated_at' },
                    ]}
                    btnAddUrl='/dashboard/tenants/new'
                    tabs={[]}
               />

               <Scrollbar>
                    <Table>
                         <TableHead>
                              <TableRow>
                                   <TableCell padding="checkbox">
                                        <Checkbox
                                             checked={selectedAll}
                                             indeterminate={selectedSome}
                                             onChange={(e) => {
                                                  if (e.target.checked) tenantSelection.handleSelectAll();
                                                  else tenantSelection.handleDeselectAll();
                                             }}
                                        />
                                   </TableCell>
                                   <TableCell>Name / Email</TableCell>
                                   <TableCell>Apartment</TableCell>
                                   <TableCell>Building Address</TableCell>
                                   <TableCell>Move-in</TableCell>
                                   <TableCell>Move-out</TableCell>
                                   <TableCell>Primary</TableCell>
                              </TableRow>
                         </TableHead>
                         <TableBody>
                              {visibleRows.length > 0 ? (
                                   visibleRows.map((tenant) => {
                                        const isSelected = tenantSelection.selected.includes(tenant.id);
                                        return (
                                             <TableRow hover key={tenant.id} selected={isSelected}>
                                                  <TableCell padding="checkbox">
                                                       <Checkbox
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                 if (e.target.checked) tenantSelection.handleSelectOne(tenant.id);
                                                                 else tenantSelection.handleDeselectOne(tenant.id);
                                                            }}
                                                       />
                                                  </TableCell>
                                                  <TableCell>
                                                       <Stack direction="row" spacing={1} alignItems="center">
                                                            <Avatar>
                                                                 {getInitials(`${tenant.first_name} ${tenant.last_name}`)}
                                                            </Avatar>
                                                            <Box>
                                                                 <Typography variant="subtitle2">{tenant.first_name} {tenant.last_name}</Typography>
                                                                 <Typography variant="body2" color="text.secondary">{tenant.email}</Typography>
                                                            </Box>
                                                       </Stack>
                                                  </TableCell>
                                                  <TableCell>{tenant.apartment?.apartment_number ?? '-'}</TableCell>
                                                  <TableCell>{tenant.apartment?.building ? `${tenant.apartment.building.street_address}, ${tenant.apartment.building.city}` : '-'}</TableCell>
                                                  <TableCell>{tenant.move_in_date ?? '-'}</TableCell>
                                                  <TableCell>{tenant.move_out_date ?? '-'}</TableCell>
                                                  <TableCell>
                                                       {tenant.is_primary ? (
                                                            <SvgIcon><CheckCircleIcon color="success" /></SvgIcon>
                                                       ) : (
                                                            <SvgIcon><CancelIcon color="error" /></SvgIcon>
                                                       )}
                                                  </TableCell>
                                             </TableRow>
                                        );
                                   })
                              ) : (
                                   <TableRow>
                                        <TableCell colSpan={7} align="center">
                                             <Typography variant="body2">No tenants found.</Typography>
                                        </TableCell>
                                   </TableRow>
                              )}
                         </TableBody>
                    </Table>
               </Scrollbar>

               <TablePagination
                    component="div"
                    count={count}
                    onPageChange={handlePageChange}
                    onRowsPerPageChange={handleRowsPerPageChange}
                    page={state.page}
                    rowsPerPage={state.rowsPerPage}
                    rowsPerPageOptions={[5, 10, 25]}
                    showFirstButton
                    showLastButton
               />

               <PopupModal
                    isOpen={deleteTenantsDialog.open}
                    onClose={deleteTenantsDialog.handleClose}
                    onConfirm={handleDeleteTenantsConfirm}
                    title={t('warning.deleteWarningTitle')}
                    confirmText={t('common.btnDelete')}
                    cancelText={t('common.btnClose')}
                    children={t('warning.deleteWarningMessage')}
                    type={'confirmation'}
               />
          </Box>
     );
};

TenantListTable.propTypes = {
     items: PropTypes.array,
};