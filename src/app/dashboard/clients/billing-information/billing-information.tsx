'use client'

import React, { useState, useMemo, useCallback, ChangeEvent } from "react";
import { Button, Card } from "@mui/material";
import { ClientBillingInformation, ClientBillingInformationStatus, clientBillingInformationStatusMapping } from "src/types/client-billing-information";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { SearchAndBooleanFilters } from "src/components/filter-list-search";
import { deleteClientBillingInformation } from "src/app/actions/client/client-billing-actions";
import { Client } from "src/types/client";
import { GenericTable, TableColumn } from "src/components/generic-table";
import { paymentMethodMapping } from "src/types/payment";

type BillingFilters = {
     search?: string;
     [key: string]: string | boolean | undefined;
}

type BillingInfoSearchState = {
     filters?: BillingFilters;
     page?: number;
     rowsPerPage?: number;
};

const useBillingInfoSearch = () => {
     const [state, setState] = useState<BillingInfoSearchState>({
          filters: {
               search: '',
          },
          page: 0,
          rowsPerPage: 5,
     });

     const handleFiltersChange = useCallback((filters: BillingFilters): void => {
          setState((prev) => ({ ...prev, filters, page: 0 }));
     }, []);

     const handlePageChange = useCallback(
          (_event: React.MouseEvent<HTMLButtonElement> | null, page: number): void => {
               setState((prev) => ({ ...prev, page }));
          },
          []
     );

     const handleRowsPerPageChange = useCallback(
          (event: ChangeEvent<HTMLInputElement>): void => {
               setState((prev) => ({
                    ...prev,
                    rowsPerPage: parseInt(event.target.value, 10),
                    page: 0,
               }));
          },
          []
     );

     return {
          state,
          handleFiltersChange,
          handlePageChange,
          handleRowsPerPageChange,
     };
};

interface BillingInformationTableProps {
     data?: (ClientBillingInformation & { client: Client })[]
     clients?: Client[]
}

const BillingInformationTable: React.FC<BillingInformationTableProps> = ({ data = [], clients }) => {
     const { t } = useTranslation();
     const billingInfoSearch = useBillingInfoSearch();

     const filteredBillingInformation = useMemo(() => {
          const { search, ...boolFilters } = billingInfoSearch.state.filters ?? { search: '' };

          return data.filter((billingInfo: ClientBillingInformation) => {
               // Search filter
               const matchesSearch = !search || billingInfo.contact_person.toLowerCase().includes(search.toLowerCase());
               // Boolean status filters
               const status = billingInfo.billing_status;
               const statusFilters = ['active', 'inactive', 'pending', 'suspended'] as const;
               const statusSelected = statusFilters.filter((s) => boolFilters[s]);
               const matchesStatus = statusSelected.length === 0 || statusSelected.includes(status);
               return matchesSearch && matchesStatus;
          });
     }, [data, billingInfoSearch.state.filters]);

     const paginatedBillingInformation = useMemo(() => {
          const page = billingInfoSearch.state.page ?? 0;
          const rowsPerPage = billingInfoSearch.state.rowsPerPage ?? 5;
          const start = page * rowsPerPage;
          const end = start + rowsPerPage;
          return filteredBillingInformation.slice(start, end);
     }, [filteredBillingInformation, billingInfoSearch.state.page, billingInfoSearch.state.rowsPerPage]);



     const handleDeleteConfirm = useCallback(async ({ id }: { id: string }) => {
          await deleteClientBillingInformation([id]);
     }, []);

     const columns: TableColumn<ClientBillingInformation & { client: Client }>[] = [
          {
               key: 'client_id',
               label: t('clients.client'),
               render: (value, row) => {
                    const clientId = typeof value === 'string' ? value : '';
                    const client = clients?.find((c) => c.id === clientId);
                    return client ? client.name : '';
               }
          },
          {
               key: 'contact_person',
               label: t('common.fullName'),
          },
          {
               key: 'billing_address',
               label: t('common.address'),
          },
          {
               key: 'card_number',
               label: t('clients.clientCardNumber'),
               render: (value) => {
                    if (typeof value === 'string' && value) return '****' + value.slice(-4);
                    return '';
               }
          },
          {
               key: 'cvc',
               label: 'CVC',
               render: () => '***'
          },
          {
               key: 'expiration_date',
               label: t('clients.clientCardExpirationDate'),
               render: (value) => {
                    if (!value) return '';
                    let dateVal: Date;
                    if (typeof value === 'string' || typeof value === 'number') {
                         dateVal = new Date(value);
                    } else if (value instanceof Date) {
                         dateVal = value;
                    } else {
                         return '';
                    }
                    return format(dateVal, 'MM/yyyy');
               }
          },
          {
               key: 'payment_method',
               label: t('clients.clientPaymentMethod'),
               render: (value) => {
                    if (typeof value === 'string') {
                         return t(paymentMethodMapping[value as keyof typeof paymentMethodMapping]);
                    }
                    return '';
               }
          },
          {
               key: 'billing_status',
               label: t('clients.clientBillingStatus'),
               render: (value) => {
                    if (typeof value === 'string') {
                         return t(clientBillingInformationStatusMapping[value as keyof typeof clientBillingInformationStatusMapping]);
                    }
                    return '';
               }
          },
          {
               key: 'updated_at',
               label: t('common.updatedAt'),
               render: (value) => {
                    if (!value) return '';
                    let dateVal: Date;
                    if (typeof value === 'number' || typeof value === 'string') {
                         dateVal = new Date(value);
                    } else if (value instanceof Date) {
                         dateVal = value;
                    } else {
                         return '';
                    }
                    return dateVal.toLocaleString();
               }
          },
     ];

     return (
          <Card sx={{ width: "100%", overflow: "hidden" }}>
               <SearchAndBooleanFilters
                    fields={[
                         { field: 'active', label: 'clients.billingInformationStatusActive' },
                         { field: 'inactive', label: 'clients.billingInformationStatusInactive' },
                         { field: 'pending', label: 'clients.billingInformationStatusPending' },
                         { field: 'suspended', label: 'clients.billingInformationStatusSuspended' },
                    ]}
                    value={billingInfoSearch.state.filters!}
                    onChange={billingInfoSearch.handleFiltersChange}
               />
               <GenericTable
                    columns={columns}
                    items={paginatedBillingInformation}
                    count={filteredBillingInformation.length}
                    page={billingInfoSearch.state.page}
                    rowsPerPage={billingInfoSearch.state.rowsPerPage}
                    onPageChange={billingInfoSearch.handlePageChange}
                    onRowsPerPageChange={billingInfoSearch.handleRowsPerPageChange}
                    baseUrl="/dashboard/clients/billing-information"
                    rowActions={[
                         (row, openActionDialog) => (
                              <Button
                                   color="error"
                                   variant="outlined"
                                   size="small"
                                   onClick={() => openActionDialog({
                                        id: row.id,
                                        title: t('warning.deleteWarningTitle'),
                                        message: t('warning.deleteWarningMessage'),
                                        confirmText: t('common.btnDelete'),
                                        cancelText: t('common.btnClose'),
                                        onConfirm: () => handleDeleteConfirm({ id: row.id })
                                   })}
                              >
                                   {t('common.btnDelete')}
                              </Button>
                         )
                    ]}
               />
          </Card>
     );
}

export default BillingInformationTable;