'use client'

import { useCallback, useMemo, useState, type ChangeEvent, type FC } from 'react';
import PropTypes from 'prop-types';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

import { Scrollbar } from 'src/components/scrollbar';
import { paths } from 'src/paths';
import { useTranslation } from 'react-i18next';
import { useSelection } from 'src/hooks/use-selection';
import { useDialog } from 'src/hooks/use-dialog';
import { PopupModal } from 'src/components/modal-dialog';
import { applySort } from 'src/utils/apply-sort';
import { useRouter } from 'next/navigation';
import { FilterBar } from '../client/table-filter';
import { SubscriptionPlan } from 'src/types/subscription-plan';
import { deleteSubscriptionPlansByIds } from 'src/app/actions/subscription-plans/subscription-plan-actions';

interface SubscriptionPlanListTableProps {
     subscriptionPlans?: SubscriptionPlan[];
}

interface DeleteSubscriptionPlanData {
     subscriptionPlanIds: string[];
}

const useSubscriptionPlanSearch = () => {

     const [state, setState] = useState({
          all: false,
          has_accepted_marketing: false,
          is_verified: false,
          is_returning: false,
          query: '',
          page: 0,
          rowsPerPage: 5,
          sortBy: 'updated_at' as keyof SubscriptionPlan,
          sortDir: 'desc' as 'asc' | 'desc',
     });

     const handleQueryChange = useCallback((filters: Partial<typeof state>) => {
          setState((prevState) => ({
               ...prevState,
               ...filters,
          }));
     }, []);

     const handleTabsChange = useCallback((value: string) => {
          setState((prevState) => ({
               ...prevState,
               all: value === 'all',
               has_accepted_marketing: value === 'has_accepted_marketing',
               is_verified: value === 'is_verified',
               is_returning: value === 'is_returning',
          }));
     }, []);

     const handlePageChange = useCallback((event: any, page: number) => {
          setState((prevState) => ({
               ...prevState,
               page,
          }));
     }, []);

     const handleRowsPerPageChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
          setState((prevState) => ({
               ...prevState,
               page: 0,
               rowsPerPage: parseInt(event.target.value, 10),
          }));
     }, []);

     const handleSortChange = useCallback((sortBy: keyof SubscriptionPlan, sortDir: 'asc' | 'desc') => {
          setState((prevState) => ({
               ...prevState,
               sortBy,
               sortDir,
          }));
     }, []);

     return {
          handleTabsChange,
          handleQueryChange,
          handleSortChange,
          handlePageChange,
          handleRowsPerPageChange,
          state,
     };
};

export const SubscriptionTable: FC<SubscriptionPlanListTableProps> = ({ subscriptionPlans = [] }) => {
     console.log('subscriptionPlans', subscriptionPlans);

     const [count, setCount] = useState(subscriptionPlans.length);
     const subscriptionPlanIds = useMemo(() => subscriptionPlans.map((subscriptionPlan: SubscriptionPlan) => subscriptionPlan.id), [subscriptionPlans]);
     const subscriptionPlanSelection = useSelection(subscriptionPlanIds);
     const selectedSome = subscriptionPlanSelection.selected.length > 0 && subscriptionPlanSelection.selected.length < subscriptionPlanIds.length;
     const selectedAll = subscriptionPlans.length > 0 && subscriptionPlanSelection.selected.length === subscriptionPlanIds.length;
     const enableBulkActions = subscriptionPlanSelection.selected.length > 0;
     const router = useRouter();

     const deleteSubscriptionPlansDialog = useDialog<DeleteSubscriptionPlanData>();
     const subscriptionPlanSearch = useSubscriptionPlanSearch();

     const { t } = useTranslation();

     const handleDeleteSubscriptionPlansClick = useCallback(() => {
          deleteSubscriptionPlansDialog.handleOpen();
     }, [deleteSubscriptionPlansDialog]);

     const handleDeleteSubscriptionPlansConfirm = useCallback(async () => {
          deleteSubscriptionPlansDialog.handleClose();
          const deleteSubscriptionPlanResponse = await deleteSubscriptionPlansByIds(subscriptionPlanSelection.selected.filter((id): id is string => id !== undefined));
          if (deleteSubscriptionPlanResponse.deleteSubscriptionPlansSuccess) {
               subscriptionPlanSelection.handleDeselectAll();
          }
     }, [deleteSubscriptionPlansDialog]);

     const visibleRows = useMemo(() => {
          // Apply filters based on state
          const filtered = subscriptionPlans.filter((subscriptionPlan: SubscriptionPlan) => {
               // Check query filter
               const matchesQuery = !subscriptionPlanSearch.state.query || subscriptionPlan.name.toLowerCase().includes(subscriptionPlanSearch.state.query.toLowerCase());

               // Check "all" filter (if "all" is true, no other filters apply)
               if (subscriptionPlanSearch.state.all) {
                    return matchesQuery;
               }

               // // Apply individual filters
               // const matchesAcceptedMarketing =
               //      !subscriptionPlanSearch.state.has_accepted_marketing || subscriptionPlan.has_accepted_marketing === subscriptionPlanSearch.state.has_accepted_marketing;

               // const matchesIsVerified =
               //      !subscriptionPlanSearch.state.is_verified || subscriptionPlan.is_verified === subscriptionPlanSearch.state.is_verified;

               // const matchesIsReturning =
               //      !subscriptionPlanSearch.state.is_returning || subscriptionPlan.is_returning === subscriptionPlanSearch.state.is_returning;
               // // Combine all filters
               return matchesQuery //&& matchesAcceptedMarketing && matchesIsVerified && matchesIsReturning;
          });

          setCount(filtered.length);
          // Apply sorting and pagination
          return applySort(filtered, subscriptionPlanSearch.state.sortBy, subscriptionPlanSearch.state.sortDir).slice(
               subscriptionPlanSearch.state.page * subscriptionPlanSearch.state.rowsPerPage,
               subscriptionPlanSearch.state.page * subscriptionPlanSearch.state.rowsPerPage + subscriptionPlanSearch.state.rowsPerPage
          );
     }, [subscriptionPlans, subscriptionPlanSearch.state]);

     return (
          <Box sx={{ position: 'relative' }}>
               <FilterBar
                    onTabsChange={subscriptionPlanSearch.handleTabsChange}
                    onFiltersChange={subscriptionPlanSearch.handleQueryChange}
                    onSortChange={subscriptionPlanSearch.handleSortChange}
                    sortBy={subscriptionPlanSearch.state.sortBy}
                    sortDir={subscriptionPlanSearch.state.sortDir}
                    tabs={[
                         { label: t('common.all'), value: 'all' },
                         { label: t('clients.clientIsVerified'), value: 'is_verified' },
                         { label: t('clients.clientHasAcceptedMarketing'), value: 'has_accepted_marketing' },
                         { label: t('clients.clientIsReturning'), value: 'is_returning' },
                    ]}
                    sortOptions={[
                         { label: t('clients.clientName'), value: 'name' },
                         { label: t('clients.clientType'), value: 'type' },
                         { label: t('clients.clientStatus'), value: 'status' },
                         { label: t('common.updatedAt'), value: 'updated_at' },
                    ]} />
               <Scrollbar>
                    <Table sx={{ minWidth: 700 }}>
                         <TableHead>
                              <TableRow>
                                   {enableBulkActions && (
                                        <Stack
                                             direction="row"
                                             spacing={2}
                                             sx={{
                                                  alignItems: 'center',
                                                  backgroundColor: (theme) =>
                                                       theme.palette.mode === 'dark' ? 'neutral.800' : 'neutral.50',
                                                  position: 'absolute',
                                                  top: 0,
                                                  left: 0,
                                                  width: '100%',
                                                  px: 2,
                                                  py: 0.5,
                                                  zIndex: 10,
                                             }}
                                        >
                                             <Checkbox
                                                  checked={selectedAll}
                                                  indeterminate={selectedSome}
                                                  onChange={(event) => {
                                                       if (event.target.checked) {
                                                            subscriptionPlanSelection.handleSelectAll();
                                                       } else {
                                                            subscriptionPlanSelection.handleDeselectAll();
                                                       }
                                                  }}
                                             />
                                             <Button color="inherit" size="small" onClick={handleDeleteSubscriptionPlansClick}>
                                                  {t('common.btnDelete')}
                                             </Button>
                                             {subscriptionPlanSelection.selected.length === 1 && (
                                                  <Button
                                                       onClick={() => router.push(paths.dashboard.clients.details + '/' + subscriptionPlanSelection.selected[0])}
                                                       color="inherit"
                                                       size="small">
                                                       {t('common.btnEdit')}
                                                  </Button>
                                             )}
                                        </Stack>
                                   )}
                                   <TableCell padding="checkbox">
                                        <Checkbox
                                             checked={selectedAll}
                                             indeterminate={selectedSome}
                                             onChange={(event) => {
                                                  if (event.target.checked) {
                                                       subscriptionPlanSelection.handleSelectAll();
                                                  } else {
                                                       subscriptionPlanSelection.handleDeselectAll();
                                                  }
                                             }}
                                        />
                                   </TableCell>
                                   <TableCell>{t('clients.clientContactPerson')}/{t('clients.clientEmail')}</TableCell>
                                   <TableCell>{t('clients.clientName')}</TableCell>
                                   <TableCell>{t('clients.clientAddress1')}</TableCell>
                                   <TableCell>{t('clients.clientAddress2')}</TableCell>
                                   <TableCell>{t('clients.clientMobilePhone')}</TableCell>
                                   <TableCell>{t('clients.clientPhone')}</TableCell>
                                   <TableCell>{t('clients.clientType')}</TableCell>
                                   <TableCell>{t('clients.clientStatus')}</TableCell>
                                   <TableCell>{t('clients.clientIsVerified')}</TableCell>
                              </TableRow>
                         </TableHead>
                         <TableBody>
                              {
                                   subscriptionPlans.length > 0 ?
                                        visibleRows.map((client) => {
                                             const isSelected = subscriptionPlanSelection.selected.includes(client.id);
                                             return (
                                                  <TableRow hover key={client.id} selected={isSelected}>
                                                       <TableCell padding="checkbox">
                                                            <Checkbox
                                                                 checked={isSelected}
                                                                 onChange={(event) => {
                                                                      if (event.target.checked) {
                                                                           subscriptionPlanSelection.handleSelectOne(client.id);
                                                                      } else {
                                                                           subscriptionPlanSelection.handleDeselectOne(client.id);
                                                                      }
                                                                 }}
                                                            />
                                                       </TableCell>
                                                       {/* <TableCell>
                                                            <Stack alignItems="center" direction="row" spacing={1}>
                                                                 <Avatar
                                                                      src={client.avatar === '' ? '' : client.avatar}
                                                                      sx={{ height: 42, width: 42 }}
                                                                 >
                                                                      {client.avatar === '' ? getInitials(client.name) : null}
                                                                 </Avatar>
                                                                 <div>
                                                                      <Link
                                                                           color="inherit"
                                                                           component="a"
                                                                           href={paths.dashboard.clients.details + client.id}
                                                                           variant="subtitle2"
                                                                      >
                                                                           {client.contact_person}
                                                                      </Link>
                                                                      <Typography color="text.secondary" variant="body2">
                                                                           {client.email}
                                                                      </Typography>
                                                                 </div>
                                                            </Stack>
                                                       </TableCell>
                                                       <TableCell sx={{ width: '200px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                                            {client.name}
                                                       </TableCell>
                                                       <TableCell sx={{ width: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {client.address_1}
                                                       </TableCell>
                                                       <TableCell sx={{ width: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {client.address_2}
                                                       </TableCell>
                                                       <TableCell>{client.mobile_phone}</TableCell>
                                                       <TableCell>{client.phone}</TableCell>
                                                       <TableCell>{client.type}</TableCell>
                                                       <TableCell>
                                                            {clientStatuses?.find((cs) => cs.id === client.client_status)?.name ?? ''}
                                                       </TableCell>
                                                       <TableCell>
                                                            {client.is_verified ? (
                                                                 <SvgIcon>
                                                                      <CheckCircleIcon color="success" />
                                                                 </SvgIcon>
                                                            ) : (
                                                                 <SvgIcon>
                                                                      <CancelIcon color="error" />
                                                                 </SvgIcon>
                                                            )}
                                                       </TableCell> */}
                                                  </TableRow>
                                             );
                                        })
                                        :
                                        <Typography sx={{ m: '20px' }}>
                                             {t('common.emptyTableInfo')}
                                        </Typography>
                              }
                         </TableBody>
                    </Table>
               </Scrollbar>
               <TablePagination
                    component="div"
                    count={count}
                    onPageChange={subscriptionPlanSearch.handlePageChange}
                    onRowsPerPageChange={subscriptionPlanSearch.handleRowsPerPageChange}
                    page={subscriptionPlanSearch.state.page}
                    rowsPerPage={subscriptionPlanSearch.state.rowsPerPage}
                    rowsPerPageOptions={[5, 10, 25]}
                    showFirstButton
                    showLastButton
                    labelRowsPerPage={t('common.rowsPerPage')}
               />
               <PopupModal
                    isOpen={deleteSubscriptionPlansDialog.open}
                    onClose={() => deleteSubscriptionPlansDialog.handleClose()}
                    onConfirm={handleDeleteSubscriptionPlansConfirm}
                    title={t('warning.deleteWarningTitle')}
                    confirmText={t('common.btnDelete')}
                    cancelText={t('common.btnClose')}
                    children={t('warning.deleteWarningMessage')}
                    type={'confirmation'} />
          </Box>
     );
};

SubscriptionTable.propTypes = {
     subscriptionPlans: PropTypes.array,
};
