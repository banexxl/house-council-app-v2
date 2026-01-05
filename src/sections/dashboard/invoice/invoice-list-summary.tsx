import type { FC } from 'react';
import ClockIcon from '@untitled-ui/icons-react/build/esm/Clock';
import ReceiptCheckIcon from '@untitled-ui/icons-react/build/esm/ReceiptCheck';
import ReceiptIcon from '@untitled-ui/icons-react/build/esm/Receipt';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { Grid } from '@mui/material';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import numeral from 'numeral';

import type { PolarOrder } from 'src/types/polar-order-types';

interface InvoiceListSummaryProps {
  invoices: PolarOrder[];
}

export const InvoiceListSummary: FC<InvoiceListSummaryProps> = (props) => {
  const { invoices } = props;

  const totalCount = invoices.length;
  const totalAmountRaw = invoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);

  const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid');
  const paidCount = paidInvoices.length;
  const paidAmountRaw = paidInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);

  const pendingInvoices = invoices.filter((invoice) => invoice.status === 'pending');
  const pendingCount = pendingInvoices.length;
  const pendingAmountRaw = pendingInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);

  const currency = invoices[0]?.currency ?? '';
  const formatAmount = (amount: number) =>
    numeral(amount).format(currency ? `${currency}0,0.00` : '0,0.00');

  const totalAmount = formatAmount(totalAmountRaw);
  const paidAmount = formatAmount(paidAmountRaw);
  const pendingAmount = formatAmount(pendingAmountRaw);

  return (
    <div>
      <Grid
        container
        spacing={3}
      >
        <Grid
          size={{ xs: 12, md: 6, lg: 4 }}
        >
          <Card>
            <CardContent>
              <Stack
                alignItems="center"
                direction="row"
                spacing={2}
              >
                <Avatar
                  sx={{
                    height: 48,
                    width: 48,
                  }}
                >
                  <ReceiptIcon />
                </Avatar>
                <div>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    Total
                  </Typography>
                  <Typography variant="h6">{totalAmount}</Typography>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    from {totalCount} invoice{totalCount === 1 ? '' : 's'}
                  </Typography>
                </div>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid
          size={{ xs: 12, md: 6, lg: 4 }}
        >
          <Card>
            <CardContent>
              <Stack
                alignItems="center"
                direction="row"
                spacing={2}
              >
                <Avatar
                  sx={{
                    backgroundColor: 'success.lightest',
                    color: 'success.main',
                    height: 48,
                    width: 48,
                  }}
                >
                  <ReceiptCheckIcon />
                </Avatar>
                <div>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    Paid
                  </Typography>
                  <Typography variant="h6">{paidAmount}</Typography>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    from {paidCount} invoice{paidCount === 1 ? '' : 's'}
                  </Typography>
                </div>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid
          size={{ xs: 12, md: 6, lg: 4 }}
        >
          <Card>
            <CardContent>
              <Stack
                alignItems="center"
                direction="row"
                spacing={2}
              >
                <Avatar
                  sx={{
                    backgroundColor: 'warning.lightest',
                    color: 'warning.main',
                    height: 48,
                    width: 48,
                  }}
                >
                  <ClockIcon />
                </Avatar>
                <div>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    Pending
                  </Typography>
                  <Typography variant="h6">{pendingAmount}</Typography>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    from {pendingCount} invoice{pendingCount === 1 ? '' : 's'}
                  </Typography>
                </div>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};
