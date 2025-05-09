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
import toast from 'react-hot-toast';
import { BaseEntity } from 'src/types/base-entity';

interface SubscriptionPlanListTableProps {
     subscriptionPlans?: SubscriptionPlan[];
     subscriptionPlanStatuses?: BaseEntity[];
}

interface DeleteSubscriptionPlanData {
     subscriptionPlanIds: string[];
}

const useSubscriptionPlanSearch = () => {

     const [state, setState] = useState({
          all: false,
          is_billed_annually: false,
          is_discounted: false,
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
               is_billed_annually: value === 'is_billed_annually',
               is_discounted: value === 'is_discounted',
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

export const SubscriptionTable: FC<SubscriptionPlanListTableProps> = ({ subscriptionPlans = [], subscriptionPlanStatuses }) => {

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
               toast.success(t('common.deleteSuccess'));
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
               const matchesCanBillYearly =
                    !subscriptionPlanSearch.state.is_billed_annually || subscriptionPlan.is_billed_annually === subscriptionPlanSearch.state.is_billed_annually;

               const matchesIsDiscounted =
                    !subscriptionPlanSearch.state.is_discounted || subscriptionPlan.is_discounted === subscriptionPlanSearch.state.is_discounted;

               // // Combine all filters
               return matchesQuery && matchesCanBillYearly && matchesIsDiscounted;
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
               <Typography variant="h5">{t('subscriptionPlans.subscriptionPlanList')}</Typography>
               <FilterBar
                    onTabsChange={subscriptionPlanSearch.handleTabsChange}
                    onFiltersChange={subscriptionPlanSearch.handleQueryChange}
                    onSortChange={subscriptionPlanSearch.handleSortChange}
                    sortBy={subscriptionPlanSearch.state.sortBy}
                    sortDir={subscriptionPlanSearch.state.sortDir}
                    tabs={[
                         { label: t('common.all'), value: 'all' },
                         { label: t('subscriptionPlans.subscriptionPlanYearlyBilling'), value: 'is_billed_annually' },
                         { label: t('subscriptionPlans.subscriptionPlanIsDiscounted'), value: 'is_discounted' },
                    ]}
                    sortOptions={[
                         { label: t('subscriptionPlans.subscriptionPlanName'), value: 'name' },
                         { label: t('common.updatedAt'), value: 'updatedAt' },
                         { label: t('subscriptionPlans.subscriptionPlanTotalPrice'), value: 'price' },
                         { label: t('subscriptionPlans.subscriptionPlanBasePrice'), value: 'base_price' },
                    ]}
                    btnAddUrl={paths.dashboard.subscriptions.new}
               />
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
                                                       onClick={() => router.push(paths.dashboard.subscriptions.index + '/' + subscriptionPlanSelection.selected[0])}
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
                                   <TableCell>{t('subscriptionPlans.subscriptionPlanName')}</TableCell>
                                   <TableCell>{t('subscriptionPlans.subscriptionPlanStatus')}</TableCell>
                                   <TableCell>{t('subscriptionPlans.subscriptionPlanBasePrice')}</TableCell>
                                   <TableCell>{t('subscriptionPlans.subscriptionPlanYearlyBilling')}</TableCell>
                                   <TableCell>{t('subscriptionPlans.subscriptionPlanYearlyDiscount')}</TableCell>
                                   <TableCell>{t('subscriptionPlans.subscriptionPlanIsDiscounted')}</TableCell>
                                   <TableCell>{t('subscriptionPlans.subscriptionPlanDiscountPercentage')}</TableCell>
                                   <TableCell>{t('subscriptionPlans.subscriptionPlanTotalPrice')}</TableCell>
                              </TableRow>
                         </TableHead>
                         <TableBody>
                              {
                                   subscriptionPlans.length > 0 ?
                                        visibleRows.map((subscriptionPlan: SubscriptionPlan) => {
                                             const isSelected = subscriptionPlanSelection.selected.includes(subscriptionPlan.id);
                                             return (
                                                  <TableRow hover key={subscriptionPlan.id} selected={isSelected}>
                                                       <TableCell padding="checkbox">
                                                            <Checkbox
                                                                 checked={isSelected}
                                                                 onChange={(event) => {
                                                                      if (event.target.checked) {
                                                                           subscriptionPlanSelection.handleSelectOne(subscriptionPlan.id);
                                                                      } else {
                                                                           subscriptionPlanSelection.handleDeselectOne(subscriptionPlan.id);
                                                                      }
                                                                 }}
                                                            />
                                                       </TableCell>
                                                       <TableCell sx={{ width: '200px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                                            {subscriptionPlan.name}
                                                       </TableCell>
                                                       <TableCell sx={{ width: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {
                                                                 subscriptionPlanStatuses?.find((cs) => cs.id === subscriptionPlan.status_id)?.name ?? ''
                                                            }
                                                       </TableCell>
                                                       <TableCell sx={{ width: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {subscriptionPlan.base_price}
                                                       </TableCell>
                                                       <TableCell>
                                                            {subscriptionPlan.is_billed_annually ? (
                                                                 <SvgIcon>
                                                                      <CheckCircleIcon color="success" />
                                                                 </SvgIcon>
                                                            ) : (
                                                                 <SvgIcon>
                                                                      <CancelIcon color="error" />
                                                                 </SvgIcon>
                                                            )}
                                                       </TableCell>
                                                       <TableCell>{subscriptionPlan.annual_discount_percentage}</TableCell>
                                                       <TableCell>
                                                            {subscriptionPlan.is_discounted ? (
                                                                 <SvgIcon>
                                                                      <CheckCircleIcon color="success" />
                                                                 </SvgIcon>
                                                            ) : (
                                                                 <SvgIcon>
                                                                      <CancelIcon color="error" />
                                                                 </SvgIcon>
                                                            )}
                                                       </TableCell>
                                                       <TableCell>{subscriptionPlan.discount_percentage}</TableCell>
                                                       <TableCell>{subscriptionPlan.total_price}</TableCell>
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
