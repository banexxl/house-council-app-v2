'use client'

import React, { useState, useMemo, useCallback, ChangeEvent } from "react";
import { Card } from "@mui/material";
import { ClientBillingInformation, clientBillingInformationStatusMapping } from "src/types/client-billing-information";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { SearchAndBooleanFilters } from "src/components/filter-list-search";
import { deleteClientBillingInformation } from "src/app/actions/client/client-billing-actions";
import { Client } from "src/types/client";
import { GenericTable, TableColumn } from "src/components/generic-table";
import { paymentMethodMapping } from "src/types/payment";

interface BillingInformationTableProps {
     data?: (ClientBillingInformation & { client: Client })[]
     clients?: Client[]
}

const BillingInformationTable: React.FC<BillingInformationTableProps> = ({ data = [], clients }) => {
     const { t } = useTranslation();
     const [page, setPage] = useState(0);
     const [rowsPerPage, setRowsPerPage] = useState(5);
     const [filters, setFilters] = useState<{ search?: string; active?: boolean; inactive?: boolean; pending?: boolean; suspended?: boolean }>({ search: '' });

     const handlePageChange = useCallback((event: unknown, newPage: number) => {
          setPage(newPage);
     }, []);

     const handleRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
     }, []);


     const handleFiltersChange = useCallback((newFilters: typeof filters) => {
          setFilters(newFilters);
          setPage(0);
     }, []);

     const handleDeleteConfirm = async ({ id }: { id: string }) => {
          await deleteClientBillingInformation([id]);
     };

     const filtered = useMemo(() => {
          return data.filter((billingInfo: ClientBillingInformation) => {
               // Search filter
               const matchesSearch = !filters.search || billingInfo.contact_person.toLowerCase().includes(filters.search.toLowerCase());
               // Boolean status filters
               const status = billingInfo.billing_status;
               const statusFilters = ['active', 'inactive', 'pending', 'suspended'] as const;
               const statusSelected = statusFilters.filter((s) => filters[s]);
               const matchesStatus = statusSelected.length === 0 || statusSelected.includes(status);
               return matchesSearch && matchesStatus;
          });
     }, [data, filters]);


     const paginated = useMemo(() => {
          return filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
     }, [filtered, page, rowsPerPage]);

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
                    value={filters}
                    onChange={handleFiltersChange}
               />
               <GenericTable
                    columns={columns}
                    items={paginated}
                    count={filtered.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={handlePageChange}
                    onRowsPerPageChange={handleRowsPerPageChange}
                    handleDeleteConfirm={handleDeleteConfirm}
               />
          </Card>
     );
}

export default BillingInformationTable;