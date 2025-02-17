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

interface BillingInformationTableProps {
     data?: ClientBillingInformation[]
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

const BillingInformationTable: React.FC<BillingInformationTableProps> = ({ data = [] }) => {

     const { t } = useTranslation();
     const [count, setCount] = useState(data.length);
     const billingInfoSearch: ReturnType<typeof useBillingInfoSearch> = useBillingInfoSearch();
     const billingIfnoIds = useMemo(() => data.map((billingIfno) => billingIfno.id), [data]);
     const billingInfoSelection = useSelection(billingIfnoIds);
     const selectedSome = billingInfoSelection.selected.length > 0 && billingInfoSelection.selected.length < billingIfnoIds.length;
     const selectedAll = data.length > 0 && billingInfoSelection.selected.length === billingIfnoIds.length;
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
                    tabs={[]}
               />

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
               <TableContainer>
                    <Table>
                         <TableHead>
                              <TableRow>
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
                              {visibleRows && visibleRows.length > 0 ? visibleRows.map((row: any) => (
                                   <TableRow
                                        key={row.id}
                                        component="a"
                                        href={paths.dashboard.clients.billingInformation.details + '/' + row.id}
                                        sx={{ textDecoration: 'none', color: 'inherit' }}
                                   >
                                        <TableCell>{row.full_name}</TableCell>
                                        <TableCell>{row.billing_address}</TableCell>
                                        <TableCell>{row.card_number ? '•••• ' + row.card_number.slice(-4) : ''}</TableCell>
                                        <TableCell
                                             style={{
                                                  backdropFilter: 'blur(5px)', // Standard property
                                                  WebkitBackdropFilter: 'blur(5px)', // For Safari
                                                  backgroundColor: 'rgba(255, 255, 255, 0.5)', // Semi-transparent background
                                             }}
                                        >
                                             {row.cvc}
                                        </TableCell>
                                        <TableCell>{row.expiration_date ? format(new Date(row.expiration_date), 'MM/yyyy') : ''}</TableCell>
                                        <TableCell>{row.payment_method_id}</TableCell>
                                        <TableCell>{row.billing_status_id}</TableCell>
                                        <TableCell>{new Date(row.updated_at!).toLocaleString()}</TableCell>
                                   </TableRow>
                              ))
                                   :
                                   <Typography sx={{ m: '20px' }}>
                                        {t('common.emptyTableInfo')}
                                   </Typography>
                              }
                         </TableBody>
                    </Table>
               </TableContainer>
               <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={data?.length || 0}
                    rowsPerPage={billingInfoSearch.state.rowsPerPage}
                    page={billingInfoSearch.state.page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage={t('common.rowsPerPage')}
               />
          </Card>
     );
};

export default BillingInformationTable;
