import type { FC, ReactNode } from 'react';
import { useState } from 'react';
import PropTypes from 'prop-types';
import numeral from 'numeral';
import LinkIcon from '@mui/icons-material/Link';
import { format } from 'date-fns';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import { Grid, } from '@mui/material';;
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { AccountPlanIcon } from './account-plan-icon';
import { Invoice } from 'src/types/payment';
import { ClientBillingInformation } from 'src/types/client-billing-information';
import { GenericTable } from 'src/components/generic-table';
import { SubscriptionPlan } from 'src/types/subscription-plan';
import { deleteClientBillingInformation } from 'src/app/actions/client/client-billing-actions';
import toast from 'react-hot-toast';


interface AccountBillingSettingsProps {
  plan: string;
  invoices: Invoice[] | undefined | null;
  billingInfo: ClientBillingInformation[] | null;
  subscriptionPlans: SubscriptionPlan[] | null;
}

export const AccountBillingSettings: FC<AccountBillingSettingsProps> = (props) => {

  const { plan: currentPlan, invoices = [], billingInfo = [], subscriptionPlans = [] } = props;
  const [selectedPlan, setSelectedPlan] = useState<string>(currentPlan);

  const handleDeleteConfirm = async (id: string) => {
    const { deleteClientBillingInformationSuccess, deleteClientBillingInformationError } = await deleteClientBillingInformation([id]);

    if (deleteClientBillingInformationSuccess) {
      toast.success('Billing information deleted successfully');
    } else {
      toast.error(deleteClientBillingInformationError?.message!);
    }
  }

  return (
    <Stack
      spacing={4}
      {...props}
    >
      <Card>
        <CardHeader
          title="Change Plan"
          subheader="You can upgrade and downgrade whenever you want"
        />
        <CardContent sx={{ pt: 0 }}>

          <Grid container spacing={3}>
            {
              subscriptionPlans &&
              subscriptionPlans?.map((plan: SubscriptionPlan) => {
                const isSelected = plan.id === selectedPlan;
                const isCurrent = plan.id === currentPlan;
                const price = numeral(plan.total_price_with_discounts).format('$0,0.00');

                return (
                  <Grid key={plan.id} size={{ xs: 12, sm: 4 }}>
                    <Card
                      onClick={() => setSelectedPlan(plan.id!)}
                      sx={{
                        cursor: 'pointer',
                        ...(isSelected && {
                          borderColor: 'primary.main',
                          borderWidth: 2,
                          m: '-1px',
                        }),
                      }}
                      variant="outlined"
                    >
                      <CardContent>
                        <Box
                          sx={{
                            height: 52,
                            width: 52,
                            '& img': {
                              height: 'auto',
                              width: '100%',
                            },
                          }}
                        >
                          {/* Placeholder for plan icon */}
                          {
                            plan.total_price_with_discounts >= 0 && plan.total_price_with_discounts < 300 ? (
                              <AccountPlanIcon name='startup' />
                            ) : plan.total_price_with_discounts >= 300 && plan.total_price_with_discounts < 400 ? (
                              <AccountPlanIcon name='standard' />
                            ) : (
                              <AccountPlanIcon name='business' />
                            )
                          }
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            mb: 1,
                            mt: 1,
                          }}
                        >
                          <Typography variant="h5">{price}</Typography>
                          <Typography
                            color="text.secondary"
                            sx={{
                              mt: 'auto',
                              ml: '4px',
                            }}
                            variant="body2"
                          >
                            /mo
                          </Typography>
                        </Box>
                        <Stack
                          alignItems="center"
                          direction="row"
                          justifyContent="space-between"
                          spacing={3}
                        >
                          <Typography variant="overline">{plan.name}</Typography>
                          {isCurrent && (
                            <Typography color="primary.main" variant="caption">
                              Using now
                            </Typography>
                          )}
                        </Stack>
                        {/* Render features */}
                        <Box sx={{ mt: 2 }}>
                          {
                            plan && plan.features &&
                              plan.features.length > 0 ? (
                              <Stack spacing={1}>
                                {plan.features.map((feature) => (
                                  <Typography key={feature} variant="body2" color="text.secondary">
                                    {feature}
                                  </Typography>
                                ))}
                                {!isCurrent && (
                                  <Button
                                    endIcon={<LinkIcon fontSize="small" />}
                                    href={'https://nest-link.app/pricing'}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                    variant="text"
                                  >
                                    Upgrade now
                                  </Button>
                                )}
                              </Stack>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No features available
                              </Typography>
                            )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
          </Grid>

          <Divider sx={{ my: 3 }} />
          <Box
            sx={{
              alignItems: 'center',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="h6">Billing details</Typography>
          </Box>
          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              mt: 3,
            }}
          >
            {
              billingInfo && billingInfo.length > 0 &&
              <GenericTable
                items={billingInfo}
                count={billingInfo.length}
                columns={
                  [
                    { key: 'contact_person', label: 'Billing name' },
                    {
                      key: 'card_number',
                      label: 'Card number',
                      render: (value: any) => value ? `**** ${String(value).slice(-4)}` : 'N/A'
                    },
                    {
                      key: 'billing_address',
                      label: 'Address',
                      render: (value: any) => value ? `${value.split(',')[0]?.trim()}, ${value.split(',')[1]?.trim()}, ${value.split(',')[3]}` : 'N/A'
                    },
                  ]
                }
                handleDeleteConfirm={({ id }) => handleDeleteConfirm(id)}
              />
            }
          </Box>
          <Typography
            color="text.secondary"
            variant="body2"
            sx={{ mt: 3 }}
          >
            We cannot refund once you purchased a subscription, but you can always
            <Link
              href="https://nest-link.app/profile"
              sx={{ ml: '4px' }}
              underline="none"
              variant="body2"
            >
              Cancel
            </Link>
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              mt: 3,
            }}
            component={Link}
            href="https://nest-link.app/pricing"
            target="_blank"
          >
            <Button variant="contained">Upgrade Plan</Button>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardHeader
          title="Invoice history"
          subheader="You can view and download all your previous invoices here. If you’ve just made a payment, it may take a few hours for it to appear in the table below."
        />
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Total (incl. tax)</TableCell>
              <TableCell>Billing Information</TableCell>
              <TableCell>Client</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {
              invoices && invoices.length > 0 ? invoices.map((invoice) => {
                const created_at = invoice.created_at ? format(new Date(invoice.created_at), 'dd MMM yyyy') : '';
                const amount = numeral(invoice.total_paid).format('$0,0.00');

                return (
                  <TableRow key={invoice.id}>
                    <TableCell>{created_at}</TableCell>
                    <TableCell>{amount}</TableCell>
                    <TableCell>{invoice.billing_information ? `**** ${String(invoice.billing_information.card_number).slice(-4)}` : 'N/A'}</TableCell>
                    <TableCell>{invoice.client.name ? `${invoice.client.name}` : 'N/A'}</TableCell>
                    <TableCell align="right">
                      <Link
                        color="inherit"
                        underline="always"
                        href="/"
                      >
                        View Invoice
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
                :
                (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      No invoices found
                    </TableCell>
                  </TableRow>
                )
            }
          </TableBody>
        </Table>
      </Card>
    </Stack>
  );
};

AccountBillingSettings.propTypes = {
  plan: PropTypes.string.isRequired,
  invoices: PropTypes.array.isRequired,
};
