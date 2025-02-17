'use client'

import React, { useState, useEffect, useMemo, ChangeEvent } from "react";
import {
     Table,
     TableBody,
     TableCell,
     TableContainer,
     TableHead,
     TableRow,
     TablePagination,
     Paper,
     Card,
     Typography,
     Checkbox,
     Button,
     Stack,
} from "@mui/material";
import { useCallback } from "react";
import { ClientBillingInformation } from "src/types/client-billing-information";
import { format } from "date-fns";
import { paths } from "src/paths";
import { useTranslation } from "react-i18next";
import { FilterBar } from "../table-filter";
import { useSelection } from "src/hooks/use-selection";
import { useDialog } from "src/hooks/use-dialog";
import { applySort } from "src/utils/apply-sort";
import { Scrollbar } from "src/components/scrollbar";
import { PopupModal } from "src/components/modal-dialog";
import { deleteClientBillingInformation } from "src/app/actions/client-actions/client-billing-actions";
import { BaseEntity } from "src/app/actions/base-entity-services";
import { Client } from "./client-select";
import Link from "next/link";

interface BillingInformationTableProps {
     data?: ClientBillingInformation[]
     paymentMethods?: BaseEntity[]
     billingInfoStatuses?: BaseEntity[]
     clients?: Client[]
}

interface DeleteBillingInfoData {
     billingInfoIds: string[];
}

const useBillingInfoSearch = () => {

     const [state, setState] = useState({
          all: false,
          query: '',
          page: 0,
          rowsPerPage: 5,
          sortBy: 'updated_at' as keyof ClientBillingInformation,
          sortDir: 'desc' as 'asc' | 'desc',
     });

     const handleQueryChange = useCallback((filters: Partial<typeof state>) => {
          setState((prevState) => ({
               ...prevState,
               ...filters,
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

     const handleSortChange = useCallback((sortBy: keyof ClientBillingInformation, sortDir: 'asc' | 'desc') => {
          setState((prevState) => ({
               ...prevState,
               sortBy,
               sortDir,
          }));
     }, []);

     return {
          handleQueryChange,
          handleSortChange,
          handlePageChange,
          handleRowsPerPageChange,
          state,
     };
};

const BillingInformationTable: React.FC<BillingInformationTableProps> = ({ data = [], paymentMethods, billingInfoStatuses, clients }) => {

     const { t } = useTranslation();
     const [count, setCount] = useState(data.length);
     const billingInfoSearch: ReturnType<typeof useBillingInfoSearch> = useBillingInfoSearch();
     const billingInfoIds = useMemo(() => data.map((billingIfno: ClientBillingInformation) => billingIfno.id), [data]);
     const billingInfoSelection = useSelection(billingInfoIds);
     const selectedSome = billingInfoSelection.selected.length > 0 && billingInfoSelection.selected.length < billingInfoIds.length;
     const selectedAll = data.length > 0 && billingInfoSelection.selected.length === billingInfoIds.length;
     const enableBulkActions = billingInfoSelection.selected.length > 0;

     const deleteBillingInfoDialog = useDialog<DeleteBillingInfoData>();

     const handleChangePage = useCallback((event: unknown, newPage: number) => {
          billingInfoSearch.handlePageChange(event, newPage);
     }, []);

     const handleChangeRowsPerPage = useCallback(
          (event: React.ChangeEvent<HTMLInputElement>) => {
               billingInfoSearch.handleRowsPerPageChange(event);
               billingInfoSearch.handlePageChange(null, 0);
          },
          []
     );

     const handleDeleteBillingInfoClick = useCallback(() => {
          deleteBillingInfoDialog.handleOpen();
     }, [deleteBillingInfoDialog]);

     const handleDeleteBillingInfoConfirm = useCallback(async () => {
          deleteBillingInfoDialog.handleClose();
          const deleteBillingInfoResponse = await deleteClientBillingInformation(billingInfoSelection.selected);
          if (deleteBillingInfoResponse.deleteClientBillingInformationSuccess) {
               billingInfoSelection.handleDeselectAll();
          }
     }, [deleteBillingInfoDialog]);

     const visibleRows = useMemo(() => {
          // Apply filters based on state
          const filtered = data.filter((billingInfo: ClientBillingInformation) => {
               // Check query filter
               const matchesQuery = !billingInfoSearch.state.query || billingInfo.full_name.toLowerCase().includes(billingInfoSearch.state.query.toLowerCase());

               // Check "all" filter (if "all" is true, no other filters apply)
               if (billingInfoSearch.state.all) {
                    return matchesQuery;
               }

               // // Apply individual filters
               // const matchesAcceptedMarketing =
               //      !clientSearch.state.has_accepted_marketing || client.has_accepted_marketing === clientSearch.state.has_accepted_marketing;

               // const matchesIsVerified =
               //      !clientSearch.state.is_verified || client.is_verified === clientSearch.state.is_verified;

               // const matchesIsReturning =
               //      !clientSearch.state.is_returning || client.is_returning === clientSearch.state.is_returning;
               // Combine all filters
               return matchesQuery //&& matchesAcceptedMarketing && matchesIsVerified && matchesIsReturning;
          });

          setCount(filtered.length);
          // Apply sorting and pagination
          return applySort(filtered, billingInfoSearch.state.sortBy, billingInfoSearch.state.sortDir).slice(
               billingInfoSearch.state.page * billingInfoSearch.state.rowsPerPage,
               billingInfoSearch.state.page * billingInfoSearch.state.rowsPerPage + billingInfoSearch.state.rowsPerPage
          );



     }, [data, billingInfoSearch.state]);

     return (
          <Card sx={{ width: "100%", overflow: "hidden" }}>
               <FilterBar
                    onFiltersChange={billingInfoSearch.handleQueryChange}
                    onSortChange={billingInfoSearch.handleSortChange} // Remove the arrow function
                    sortBy={billingInfoSearch.state.sortBy} // Pass value, not a function
                    sortDir={billingInfoSearch.state.sortDir} // Pass value, not a function
                    sortOptions={[
                         { label: t('clients.clientName'), value: 'full_name' },
                         { label: t('common.updatedAt'), value: 'updated_at' },
                    ]}
                    tabs={[
                         { label: t('common.all'), value: 'all' },]
                    }
               />
               <Scrollbar>
                    <Table>
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
                                                            billingInfoSelection.handleSelectAll();
                                                       } else {
                                                            billingInfoSelection.handleDeselectAll();
                                                       }
                                                  }}
                                             />
                                             <Button color="inherit" size="small" onClick={handleDeleteBillingInfoClick}>
                                                  {t('common.btnDelete')}
                                             </Button>
                                             {billingInfoSelection.selected.length === 1 && (
                                                  <Button color="inherit" size="small">
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
                                                       billingInfoSelection.handleSelectAll();
                                                  } else {
                                                       billingInfoSelection.handleDeselectAll();
                                                  }
                                             }}
                                        />
                                   </TableCell>
                                   <TableCell>{t('clients.client')}</TableCell>
                                   <TableCell>{t('common.fullName')}</TableCell>
                                   <TableCell>{t('common.address')}</TableCell>
                                   <TableCell>{t('clients.clientCardNumber')}</TableCell>
                                   <TableCell>CVC</TableCell>
                                   <TableCell>{t('clients.clientCardExpirationDate')}</TableCell>
                                   <TableCell>{t('clients.clientPaymentMethod')}</TableCell>
                                   <TableCell>{t('clients.clientBillingStatus')}</TableCell>
                                   <TableCell>{t('common.updatedAt')}</TableCell>
                              </TableRow>
                         </TableHead>
                         <TableBody>
                              {visibleRows && visibleRows.length > 0 ? visibleRows.map((row: ClientBillingInformation) => {
                                   const isSelected = billingInfoSelection.selected.includes(row.id);
                                   return (
                                        <TableRow
                                             key={row.id}
                                             component="a"
                                             // href={paths.dashboard.clients.billingInformation.details + '/' + row.id}
                                             sx={{ textDecoration: 'none', color: 'inherit' }}
                                        >
                                             <TableCell padding="checkbox">
                                                  <Checkbox
                                                       checked={isSelected}
                                                       onChange={(event) => {
                                                            if (event.target.checked) {
                                                                 billingInfoSelection.handleSelectOne(row.id);
                                                            } else {
                                                                 billingInfoSelection.handleDeselectOne(row.id);
                                                            }
                                                       }}
                                                  />
                                             </TableCell>
                                             <TableCell>
                                                  <Link
                                                       href={paths.dashboard.clients.details + '/' + row.client_id}
                                                       style={{ textDecoration: 'none', color: 'inherit' }}
                                                  >
                                                       {
                                                            clients!.find((client: any) => client.id === row.client_id)?.name
                                                       }
                                                  </Link>
                                             </TableCell>
                                             <TableCell>{row.full_name}</TableCell>
                                             <TableCell>{row.billing_address}</TableCell>
                                             <TableCell>{row.card_number ? '****' + row.card_number.slice(-4) : ''}</TableCell>
                                             <TableCell>
                                                  ***
                                             </TableCell>
                                             <TableCell>{row.expiration_date ? format(new Date(row.expiration_date), 'MM/yyyy') : ''}</TableCell>
                                             <TableCell>
                                                  {
                                                       paymentMethods!.find((method: any) => method.id === row.payment_method_id)?.name
                                                  }
                                             </TableCell>
                                             <TableCell>
                                                  {
                                                       billingInfoStatuses!.find((status: any) => status.id === row.billing_status_id)?.name
                                                  }
                                             </TableCell>
                                             <TableCell>{new Date(row.updated_at!).toLocaleString()}</TableCell>
                                        </TableRow>
                                   )
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
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={count}
                    rowsPerPage={billingInfoSearch.state.rowsPerPage}
                    page={billingInfoSearch.state.page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage={t('common.rowsPerPage')}
               />
               <PopupModal
                    isOpen={deleteBillingInfoDialog.open}
                    onClose={() => deleteBillingInfoDialog.handleClose()}
                    onConfirm={handleDeleteBillingInfoConfirm}
                    title={t('warning.deleteWarningTitle')}
                    confirmText={t('common.btnDelete')}
                    cancelText={t('common.btnClose')}
                    children={t('warning.deleteWarningMessage')}
                    type={'confirmation'} />
          </Card>
     );
};

export default BillingInformationTable;
