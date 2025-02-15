'use client'

import React, { useState, useEffect, useMemo } from "react";
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
} from "@mui/material";
import { useCallback } from "react";
import { ClientBillingInformation } from "src/types/client-billing-information";
import { format } from "date-fns";
import { paths } from "src/paths";
import { useTranslation } from "react-i18next";

interface BillingInformationTableProps {
     data?: ClientBillingInformation[]
}

const BillingInformationTable: React.FC<BillingInformationTableProps> = ({ data = [] }) => {

     const { t } = useTranslation();
     const [page, setPage] = useState(0);
     const [rowsPerPage, setRowsPerPage] = useState(5);

     // Memoize the paginated data
     const paginatedData = useMemo(
          () => data && data?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
          [data, page, rowsPerPage]
     );

     const handleChangePage = useCallback((event: unknown, newPage: number) => {
          setPage(newPage);
     }, []);

     const handleChangeRowsPerPage = useCallback(
          (event: React.ChangeEvent<HTMLInputElement>) => {
               setRowsPerPage(parseInt(event.target.value, 10));
               setPage(0);
          },
          []
     );

     return (
          <Card sx={{ width: "100%", overflow: "hidden" }}>
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
                              {paginatedData && paginatedData.length > 0 ? paginatedData.map((row) => (
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
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage={t('common.rowsPerPage')}
               />
          </Card>
     );
};

export default BillingInformationTable;
