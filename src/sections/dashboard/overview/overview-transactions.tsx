import type { FC } from 'react';
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

  return (
    <Card>
      <CardHeader
        title="Latest Transactions"
        subheader="Based on the selected period"
        sx={{ pb: 0 }}
      />
      <Tabs
        value="all"
        sx={{ px: 3 }}
      >
        <Tab
          label="All"
          value="all"
        />
        <Tab
          label="Confirmed"
          value="confirmed"
        />
        <Tab
          label="Pending"
          value="pending"
        />
      </Tabs>
      <Divider />
      <Scrollbar>
        <Table sx={{ minWidth: 600 }}>
          <TableBody>
            {rows.map((invoice) => {
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
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell width={100}>
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
                  <TableCell width={180}>
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
          </TableBody>
        </Table>
      </Scrollbar>
    </Card>
  );
};
