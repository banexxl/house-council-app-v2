"use client";

import { useCallback, useMemo, useState, type FC } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Avatar, Stack, Typography, SvgIcon } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import Link from '@mui/material/Link';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { paths } from 'src/paths';
import { GenericTable } from 'src/components/generic-table';
import { SearchAndBooleanFilters } from 'src/components/filter-list-search';
import { clientStatusMapping, clientTypeMapping, type Client } from 'src/types/client';
import { getInitials } from 'src/utils/get-initials';
import { deleteClientByIDsAction } from 'src/app/actions/client/client-actions';
import { toast } from 'react-hot-toast';

interface ClientListTableProps { items?: Client[]; }

export const ClientListTable: FC<ClientListTableProps> = ({ items = [] }) => {

  const { t } = useTranslation();
  const router = useRouter();
  const [filters, setFilters] = useState<{ search?: string; client_type?: string; client_status?: string; is_verified?: string }>({});
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  const handleFiltersChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  const filteredClients = useMemo(() => {
    const search = filters.search?.toLowerCase().trim();
    return items.filter(c => {
      if (filters.client_type && c.client_type !== filters.client_type) return false;
      if (filters.client_status && c.client_status !== filters.client_status) return false;
      if (filters.is_verified) {
        const want = filters.is_verified === 'true';
        if (c.is_verified !== want) return false;
      }
      if (search) {
        const haystack = [
          c.name,
          c.contact_person,
          c.email,
          c.address_1,
          c.address_2,
          c.mobile_phone,
          c.phone,
          c.id,
        ].filter(Boolean).map(v => String(v).toLowerCase()).join(' ');
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [items, filters]);

  return (
    <Box sx={{ position: 'relative' }}>
      <SearchAndBooleanFilters
        value={filters}
        onChange={handleFiltersChange}
        selects={[
          {
            field: 'client_type',
            label: 'clients.clientType',
            options: Object.keys(clientTypeMapping).map(k => ({ value: k, label: clientTypeMapping[k as keyof typeof clientTypeMapping] }))
          },
          {
            field: 'client_status',
            label: 'clients.clientStatus',
            options: Object.keys(clientStatusMapping).map(k => ({ value: k, label: clientStatusMapping[k as keyof typeof clientStatusMapping] }))
          },
          {
            field: 'is_verified',
            label: 'clients.clientIsVerified',
            options: [
              { value: 'true', label: 'clients.clientIsVerified' },
              { value: 'false', label: 'common.lblNo' }
            ]
          }
        ]}
      />
      <GenericTable<Client>
        items={filteredClients}
        baseUrl="/dashboard/clients"
        columns={[
          {
            key: 'contact_person',
            label: t('clients.clientContactPerson') + '/' + t('clients.clientEmail'),
            render: (_v, row) => (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                <Avatar src={row.avatar || ''} sx={{ width: 42, height: 42 }}>
                  {!row.avatar ? getInitials(row.name) : null}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Link
                    href={paths.dashboard.clients.details + row.id}
                    variant="subtitle2"
                    underline="none"
                    sx={{ display: 'block', cursor: 'pointer' }}
                  >
                    {row.contact_person || row.name}
                  </Link>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {row.email}
                  </Typography>
                </Box>
              </Stack>
            )
          },
          { key: 'name', label: t('clients.clientName') },
          { key: 'address_1', label: t('clients.clientAddress1') },
          { key: 'address_2', label: t('clients.clientAddress2') },
          { key: 'mobile_phone', label: t('clients.clientMobilePhone') },
          { key: 'phone', label: t('clients.clientPhone') },
          {
            key: 'client_type',
            label: t('clients.clientType'),
            render: (value) => t(clientTypeMapping[value as keyof typeof clientTypeMapping])
          },
          {
            key: 'client_status',
            label: t('clients.clientStatus'),
            render: (value) => t(clientStatusMapping[value as keyof typeof clientStatusMapping])
          },
          {
            key: 'subscription_plan_name',
            label: t('subscriptionPlans.subscriptionPlanName'),
            render: (value) => {
              const text = value == null ? '' : String(value);
              return text.trim().length > 0 ? text : 'N/A';
            },
          },
          {
            key: 'is_verified',
            label: t('clients.clientIsVerified'),
            render: (value: any) => (
              <SvgIcon>
                {value ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />}
              </SvgIcon>
            )
          }
        ]}
        rowActions={[
          (client, openActionDialog) => (
            <Button
              color="error"
              variant="outlined"
              size="small"
              loading={deletingIds.includes(client.id)}
              disabled={deletingIds.length > 0}
              onClick={() => openActionDialog({
                id: client.id,
                title: t('warning.deleteWarningTitle'),
                message: t('warning.deleteWarningMessage'),
                confirmText: t('common.btnDelete'),
                cancelText: t('common.btnClose'),
                onConfirm: async () => {
                  setDeletingIds(prev => [...prev, client.id]);
                  const res = await deleteClientByIDsAction([client.id]);
                  if (res.deleteClientByIDsActionSuccess) {
                    toast.success(t('clients.clientSettingsDeleteSuccess'));
                  } else {
                    toast.error(t('common.actionDeleteError'));
                  }
                  setDeletingIds(prev => prev.filter(id => id !== client.id));
                }
              })}
            >
              {t('common.btnDelete')}
            </Button>
          )
        ]}
      />
    </Box>
  );
};

ClientListTable.propTypes = { items: PropTypes.array };
