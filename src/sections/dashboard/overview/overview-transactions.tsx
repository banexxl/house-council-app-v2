import { FC, useMemo, useState } from 'react';
import { format } from 'date-fns';
import numeral from 'numeral';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

import { Scrollbar } from 'src/components/scrollbar';
import type { SeverityPillColor } from 'src/components/severity-pill';
import { SeverityPill } from 'src/components/severity-pill';
import type { Invoice, InvoiceStatus } from 'src/types/invoice';

const statusColorMap: Record<InvoiceStatus, SeverityPillColor> = {
  paid: 'success',
  pending: 'warning',
  canceled: 'error',
};

interface OverviewTransactionsProps {
  invoices: Invoice[];
}

export const OverviewTransactions: FC<OverviewTransactionsProps> = ({ invoices }) => {
  const rows = Array.isArray(invoices) ? invoices : [];
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return rows;
    return rows.filter((i) => i.status === statusFilter);
  }, [rows, statusFilter]);

  const paginated = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page, rowsPerPage]
  );

  const handleChangeStatus = (_: unknown, value: 'all' | InvoiceStatus) => {
    setStatusFilter(value);
    setPage(0);
  };

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Card>
      <CardHeader
        title="Latest Transactions"
        subheader="Based on the selected period"
        sx={{ pb: 0 }}
      />
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
        onChange={handleChangeStatus}
        variant="scrollable"
      >
        <Tab
          label="All"
          value="all"
        />
        <Tab
          label="Paid"
          value="paid"
        />
        <Tab
          label="Pending"
          value="pending"
        />
        <Tab
          label="Canceled"
          value="canceled"
        />
      </Tabs>
      <Divider />
      <Scrollbar>
        <Table sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell width={100}>Date</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((invoice) => {
              const issuedAt = invoice.issueDate ?? invoice.dueDate ?? Date.now();
              const createdAtMonth = format(issuedAt, 'LLL').toUpperCase();
              const createdAtDay = format(issuedAt, 'd');
              const statusColor = statusColorMap[invoice.status] ?? 'info';
              const amount = numeral(invoice.totalAmount || 0).format('0,0.00');
              const currency = invoice.currency || '';
              const clientName = invoice.client?.name || invoice.client?.company || invoice.client?.email || '—';
              const description = invoice.number ? `#${invoice.number}` : '';

              return (
                <TableRow
                  key={invoice.id}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 }, height: 72 }}
                >
                  <TableCell width={120}>
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
                  </TableCell>
                  <TableCell>
                    <div>
                      <Typography variant="subtitle2">{clientName}</Typography>
                      <Typography
                        color="text.secondary"
                        variant="body2"
                      >
                        {description}
                      </Typography>
                    </div>
                  </TableCell>
                  <TableCell>
                    <SeverityPill color={statusColor}>{invoice.status}</SeverityPill>
                  </TableCell>
                  <TableCell width={180} align="right">
                    <Typography
                      color="text.primary"
                      variant="subtitle2"
                    >
                      {amount} {currency}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary" variant="body2">
                    No transactions yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Scrollbar>
      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50]}
      />
    </Card>
  );
};
