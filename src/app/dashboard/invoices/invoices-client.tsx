"use client";

import type { ChangeEvent, MouseEvent } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import FilterFunnel01Icon from '@untitled-ui/icons-react/build/esm/FilterFunnel01';
import PlusIcon from '@untitled-ui/icons-react/build/esm/Plus';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles/createTheme';

import { Seo } from 'src/components/seo';
import { InvoiceListContainer } from 'src/sections/dashboard/invoice/invoice-list-container';
import { InvoiceListSidebar } from 'src/sections/dashboard/invoice/invoice-list-sidebar';
import { InvoiceListSummary } from 'src/sections/dashboard/invoice/invoice-list-summary';
import { InvoiceListTable } from 'src/sections/dashboard/invoice/invoice-list-table';
import type { InvoiceStatus, PolarOrder } from 'src/types/polar-order-types';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

interface Filters {
     clients?: string[];
     endDate?: Date;
     query?: string;
     startDate?: Date;
     status?: InvoiceStatus;
}

interface InvoicesSearchState {
     filters: Filters;
     page: number;
     rowsPerPage: number;
}

const useInvoicesSearch = () => {
     const [state, setState] = useState<InvoicesSearchState>({
          filters: {
               clients: [],
               endDate: undefined,
               query: '',
               startDate: undefined,
          },
          page: 0,
          rowsPerPage: 5,
     });

     const handleFiltersChange = useCallback((filters: Filters): void => {
          setState((prevState) => ({
               ...prevState,
               filters,
               page: 0,
          }));
     }, []);

     const handlePageChange = useCallback(
          (_event: MouseEvent<HTMLButtonElement> | null, page: number): void => {
               setState((prevState) => ({
                    ...prevState,
                    page,
               }));
          },
          []
     );

     const handleRowsPerPageChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
          setState((prevState) => ({
               ...prevState,
               rowsPerPage: parseInt(event.target.value, 10),
          }));
     }, []);

     return {
          handleFiltersChange,
          handlePageChange,
          handleRowsPerPageChange,
          state,
     };
};

interface InvoicesClientProps {
     invoices: PolarOrder[];
}
interface InvoiceClientOption {
     id: string;
     name: string;
}

export const InvoicesClient = ({ invoices, invoiceClients }: InvoicesClientProps & { invoiceClients: InvoiceClientOption[] }) => {
     const rootRef = useRef<HTMLDivElement | null>(null);
     const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
     const invoicesSearch = useInvoicesSearch();
     const [group, setGroup] = useState<boolean>(true);
     const [openSidebar, setOpenSidebar] = useState<boolean>(lgUp);

     const handleGroupChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
          setGroup(event.target.checked);
     }, []);

     const handleFiltersToggle = useCallback((): void => {
          setOpenSidebar((prevState) => !prevState);
     }, []);

     const handleFiltersClose = useCallback((): void => {
          setOpenSidebar(false);
     }, []);

     const { paginatedInvoices, totalInvoicesCount } = useMemo(() => {
          const { filters, page, rowsPerPage } = invoicesSearch.state;

          let filtered = invoices;

          const startDay = filters.startDate ? dayjs(filters.startDate).startOf('day') : null;
          const endDay = filters.endDate ? dayjs(filters.endDate).endOf('day') : null;

          if (filters.query) {
               const query = filters.query.toLowerCase();
               filtered = filtered.filter((invoice) =>
                    invoice.invoice_number?.toLowerCase().includes(query)
               );
          }

          if (startDay) {
               filtered = filtered.filter((invoice) => {
                    const createdAt = dayjs(invoice.created_at);
                    return !createdAt.isBefore(startDay);
               });
          }

          if (endDay) {
               filtered = filtered.filter((invoice) => {
                    const createdAt = dayjs(invoice.created_at);
                    return !createdAt.isAfter(endDay);
               });
          }

          if (filters.clients && filters.clients.length > 0) {
               const selectedClientIds = new Set(filters.clients);
               filtered = filtered.filter((invoice) => selectedClientIds.has(invoice.client_id));
          }

          if (filters.status) {
               filtered = filtered.filter((invoice) => invoice.status === filters.status);
          }

          const total = filtered.length;
          const start = page * rowsPerPage;
          const end = start + rowsPerPage;

          return {
               paginatedInvoices: filtered.slice(start, end),
               totalInvoicesCount: total,
          };
     }, [invoices, invoicesSearch.state]);

     return (
          <>
               <Seo title="Dashboard: Invoice List" />
               <Divider />
               <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Box
                         component="main"
                         sx={{
                              display: 'flex',
                              flex: '1 1 auto',
                              overflow: 'hidden',
                              position: 'relative',
                         }}
                    >
                         <Box
                              ref={rootRef}
                              sx={{
                                   bottom: 0,
                                   display: 'flex',
                                   left: 0,
                                   position: 'absolute',
                                   right: 0,
                                   top: 0,
                              }}
                         >
                              <InvoiceListSidebar
                                   container={rootRef.current}
                                   filters={invoicesSearch.state.filters}
                                   clients={invoiceClients}
                                   group={group}
                                   onFiltersChange={invoicesSearch.handleFiltersChange}
                                   onClose={handleFiltersClose}
                                   onGroupChange={handleGroupChange}
                                   open={openSidebar}
                              />
                              <InvoiceListContainer open={openSidebar}>
                                   <Stack spacing={4}>
                                        <Stack
                                             alignItems="flex-start"
                                             direction="row"
                                             justifyContent="space-between"
                                             spacing={3}
                                        >
                                             <div>
                                                  <Typography variant="h4">Invoices</Typography>
                                             </div>
                                             <Stack
                                                  alignItems="center"
                                                  direction="row"
                                                  spacing={1}
                                             >
                                                  <Button
                                                       color="inherit"
                                                       startIcon={
                                                            <SvgIcon>
                                                                 <FilterFunnel01Icon />
                                                            </SvgIcon>
                                                       }
                                                       onClick={handleFiltersToggle}
                                                  >
                                                       Filters
                                                  </Button>
                                                  <Button
                                                       startIcon={
                                                            <SvgIcon>
                                                                 <PlusIcon />
                                                            </SvgIcon>
                                                       }
                                                       variant="contained"
                                                  >
                                                       New
                                                  </Button>
                                             </Stack>
                                        </Stack>
                                        <InvoiceListSummary invoices={invoices} />
                                        <InvoiceListTable
                                             count={totalInvoicesCount}
                                             group={group}
                                             items={paginatedInvoices}
                                             onPageChange={invoicesSearch.handlePageChange}
                                             onRowsPerPageChange={invoicesSearch.handleRowsPerPageChange}
                                             page={invoicesSearch.state.page}
                                             rowsPerPage={invoicesSearch.state.rowsPerPage}
                                        />
                                   </Stack>
                              </InvoiceListContainer>
                         </Box>
                    </Box>
               </LocalizationProvider>
          </>
     );
};

export default InvoicesClient;
