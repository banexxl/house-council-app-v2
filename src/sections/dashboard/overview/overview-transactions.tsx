import { FC, MouseEvent, useMemo, useState } from 'react';
import { format } from 'date-fns';
import numeral from 'numeral';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import type { SeverityPillColor } from 'src/components/severity-pill';
import { SeverityPill } from 'src/components/severity-pill';
import { GenericTable } from 'src/components/generic-table';
import type { PolarOrder, PolarOrderStatus } from 'src/types/polar-order-types';

const statusColorMap: Record<PolarOrderStatus, SeverityPillColor> = {
  pending: 'warning',
  paid: 'success',
  refunded: 'secondary',
  partially_refunded: 'info',
};

interface OverviewTransactionsProps {
  invoices: PolarOrder[];
}

export const OverviewTransactions: FC<OverviewTransactionsProps> = ({ invoices }) => {
  const rows = Array.isArray(invoices) ? invoices : [];
  const [statusFilter, setStatusFilter] = useState<'all' | PolarOrderStatus>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const { t } = useTranslation();

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return rows;
    return rows.filter((i) => i.status === statusFilter);
  }, [rows, statusFilter]);

  const paginated = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page, rowsPerPage]
  );

  const handleChangeStatus = (_: unknown, value: 'all' | PolarOrderStatus) => {
    setStatusFilter(value);
    setPage(0);
  };

  const handleChangePage = (_: MouseEvent<HTMLButtonElement> | null, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <>
      <Tabs
        value={statusFilter}
        sx={(theme) => ({
          position: 'relative',
          borderBottom: `1px solid ${theme.palette.divider}`,
          '& .MuiTab-root': {
            minHeight: 48,
            paddingLeft: theme.spacing(3),
            paddingRight: theme.spacing(3),
            marginRight: theme.spacing(2),
            fontWeight: 600,
          },
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: 3,
          }
        })}
        allowScrollButtonsMobile
        onChange={handleChangeStatus}
        variant="scrollable"
      >
        <Tab label={t('common.all', 'All')} value="all" />
        {/* <Tab label={t(invoiceStatusTokenMap.paid, 'Paid')} value="paid" />
        <Tab label={t(invoiceStatusTokenMap.pending, 'Pending')} value="pending" />
        <Tab label={t(invoiceStatusTokenMap.refunded, 'Refunded')} value="refunded" />
        <Tab label={t(invoiceStatusTokenMap.partially_refunded, 'Partially Refunded')} value="partially_refunded" /> */}
      </Tabs>
      <Box sx={{ mt: 2 }}>
        <GenericTable<PolarOrder>
          items={filtered}
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          tableTitle={'invoice.table.title'}
          tableSubtitle={'invoice.table.subtitle'}
          dense
          columns={[
            {
              key: 'createdAt',
              label: t('invoice.table.date', 'Date'),
              render: (value) => {
                const issuedAt = new Date(value as string);
                if (Number.isNaN(issuedAt.getTime())) return '-';
                const createdAtMonth = format(issuedAt, 'LLL').toUpperCase();
                const createdAtDay = format(issuedAt, 'd');
                return (
                  <Box
                    sx={{
                      p: 1,
                      backgroundColor: (theme) =>
                        theme.palette.mode === 'dark' ? 'neutral.800' : 'neutral.100',
                      borderRadius: 2,
                      maxWidth: 'fit-content',
                    }}
                  >
                    <Typography
                      align="center"
                      color="text.primary"
                      variant="caption"
                    >
                      {createdAtMonth}
                    </Typography>
                    <Typography
                      align="center"
                      color="text.primary"
                      variant="h6"
                    >
                      {createdAtDay}
                    </Typography>
                  </Box>
                );
              },
            },
            {
              key: 'customer',
              label: t('invoice.table.client', 'Client'),
              render: (_value, invoice) => {
                const clientName = invoice.customer?.name || invoice.customer?.email || '-';
                const description = invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : '';
                return (
                  <Box>
                    <Typography variant="subtitle2" noWrap>{clientName}</Typography>
                    <Typography
                      color="text.secondary"
                      variant="body2"
                      noWrap
                    >
                      {description}
                    </Typography>
                  </Box>
                );
              },
            },
            {
              key: 'status',
              label: t('invoice.table.status', 'Status'),
              // render: (value) => {
              //   const status = (value || 'pending') as PolarOrderStatus;
              //   const statusColor = statusColorMap[status] ?? 'info';
              //   const statusLabel = t(invoiceStatusTokenMap[status], status);
              //   return <SeverityPill color={statusColor}>{statusLabel}</SeverityPill>;
              // },
            },
            {
              key: 'totalAmount',
              label: t('invoice.table.amount', 'Amount'),
              render: (value, invoice) => {
                const amount = numeral((value as number) || 0).format('0,0.00');
                const currency = invoice.currency || '';
                return (
                  <Typography
                    color="text.primary"
                    variant="subtitle2"
                    noWrap
                  >
                    {amount} {currency}
                  </Typography>
                );
              },
            },
          ]}
          // Single no-op action to keep the actions column empty instead of "N/A"
          rowActions={[() => null]}
        />
      </Box>
    </>
  );
};
