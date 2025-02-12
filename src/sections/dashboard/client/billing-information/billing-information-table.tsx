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
} from "@mui/material";
import { useCallback } from "react";
import { ClientBillingInformation } from "src/types/client-billing-information";
import { format } from "date-fns";
import { paths } from "src/paths";

interface BillingInformationTableProps {
     data?: ClientBillingInformation[]
}

const BillingInformationTable: React.FC<BillingInformationTableProps> = ({ data = [] }) => {
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
                                   <TableCell>ID</TableCell>
                                   <TableCell>Full Name</TableCell>
                                   <TableCell>Billing Address</TableCell>
                                   <TableCell>Card Number</TableCell>
                                   <TableCell>CVC</TableCell>
                                   <TableCell>Expiration Date</TableCell>
                                   <TableCell>Payment Method</TableCell>
                                   <TableCell>Billing Status</TableCell>
                                   <TableCell>Updated At</TableCell>
                              </TableRow>
                         </TableHead>
                         <TableBody>
                              {paginatedData && paginatedData.map((row) => (
                                   <TableRow
                                        key={row.id}
                                        component="a"
                                        href={paths.dashboard.clients.billingInformation.details + '/' + row.id}
                                        sx={{ textDecoration: 'none', color: 'inherit' }}
                                   >
                                        <TableCell>
                                             {row?.id?.slice(-12) ?? ''}
                                        </TableCell>
                                        <TableCell>{row.full_name}</TableCell>
                                        <TableCell>{row.billing_address}</TableCell>
                                        <TableCell>{row.card_number}</TableCell>
                                        <TableCell>{row.cvc}</TableCell>
                                        <TableCell>{row.expiration_date ? format(new Date(row.expiration_date), 'MM/yyyy') : ''}</TableCell>
                                        <TableCell>{row.payment_method_id}</TableCell>
                                        <TableCell>{row.billing_status_id}</TableCell>
                                        <TableCell>{new Date(row.updated_at!).toLocaleString()}</TableCell>
                                   </TableRow>
                              ))}
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
               />
          </Card>
     );
};

export default BillingInformationTable;
