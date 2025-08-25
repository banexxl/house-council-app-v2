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
import Grid, { GridProps } from '@mui/material/Grid';
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
import { useTranslation } from 'react-i18next';


interface AccountBillingSettingsProps {
  plan: string;
  invoices: Invoice[] | undefined | null;
  billingInfo: ClientBillingInformation[] | null;
  subscriptionPlans: SubscriptionPlan[] | null;
}

export const AccountBillingSettings: FC<AccountBillingSettingsProps> = (props) => {

  const { plan: currentPlan, invoices = [], billingInfo = [], subscriptionPlans = [] } = props;
  const [selectedPlan, setSelectedPlan] = useState<string>(currentPlan);

  const { t } = useTranslation()

  const handleDelete = async (id: string) => {
    const { deleteClientBillingInformationSuccess, deleteClientBillingInformationError } = await deleteClientBillingInformation([id]);
    if (deleteClientBillingInformationSuccess) {
      toast.success(t('account.billing.deleteSuccess'));
    } else {
      toast.error(deleteClientBillingInformationError?.message!);
    }
  };

  return (
    <Stack spacing={4} {...props}>
      <Card>
        <CardHeader
          title={t('account.billing.changePlanTitle')}
          subheader={t('account.billing.changePlanSubheader')}
        />
        <CardContent sx={{ pt: 0 }}>
          <Grid container spacing={3}>
            {subscriptionPlans && subscriptionPlans.map((plan: SubscriptionPlan) => {
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
                      <Box sx={{ height: 52, width: 52, '& img': { height: 'auto', width: '100%' } }}>
                        {plan.total_price_with_discounts >= 0 && plan.total_price_with_discounts < 300 ? (
                          <AccountPlanIcon name='startup' />
                        ) : plan.total_price_with_discounts >= 300 && plan.total_price_with_discounts < 400 ? (
                          <AccountPlanIcon name='standard' />
                        ) : (
                          <AccountPlanIcon name='business' />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', mb: 1, mt: 1 }}>
                        <Typography variant="h5">{price}</Typography>
                        <Typography color="text.secondary" sx={{ mt: 'auto', ml: '4px' }} variant="body2">/mo</Typography>
                      </Box>
                      <Stack alignItems="center" direction="row" justifyContent="space-between" spacing={3}>
                        <Typography variant="overline">{plan.name}</Typography>
                        {isCurrent && (
                          <Typography color="primary.main" variant="caption">
                            {t('account.billing.usingNow')}
                          </Typography>
                        )}
                      </Stack>
                      <Box sx={{ mt: 2 }}>
                        {plan && plan.features && plan.features.length > 0 ? (
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
                                {t('account.billing.upgradeNow')}
                              </Button>
                            )}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {t('account.billing.noFeatures')}
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
          <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }} />
          {billingInfo && billingInfo.length > 0 && (
            <GenericTable
              items={billingInfo}
              count={billingInfo.length}
              columns={[
                { key: 'contact_person', label: t('account.billing.billingName') },
                {
                  key: 'card_number',
                  label: t('account.billing.cardNumber'),
                  render: (value: any) => value ? `**** ${String(value).slice(-4)}` : 'N/A'
                },
                {
                  key: 'billing_address',
                  label: t('account.billing.billingAddress'),
                  render: (value: any) => value ? `${value.split(',')[0]?.trim()}, ${value.split(',')[1]?.trim()}, ${value.split(',')[3]}` : 'N/A'
                },
              ]}
              rowActions={[
                (row, openActionDialog) => (
                  <Button
                    color="error"
                    variant="outlined"
                    size="small"
                    onClick={() => openActionDialog({
                      id: row.id,
                      title: t('account.billing.deleteTitle'),
                      message: t('account.billing.deleteMessage'),
                      confirmText: t('account.billing.deleteConfirm'),
                      cancelText: t('account.billing.deleteCancel'),
                      onConfirm: () => handleDelete(row.id)
                    })}
                  >
                    {t('common.btnDelete')}
                  </Button>
                ),
                () => (
                  <Button
                    color="error"
                    variant="outlined"
                    size="small"
                    href='https://nest-link.app/profile'
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('common.btnEdit')}
                  </Button>
                )
              ]}
              tableTitle='account.billingTableTitle'
              tableSubtitle='account.billingTableSubtitle'
            />
          )}
          <Typography color="text.secondary" variant="body2" sx={{ mt: 3 }}>
            {t('account.billing.refundNote')}
            <Link
              href="https://nest-link.app/profile"
              sx={{ ml: '4px' }}
              underline="none"
              variant="body2"
            >
              {t('account.billing.cancel')}
            </Link>
          </Typography>
          <Box
            sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}
            component={Link}
            href="https://nest-link.app/pricing"
            target="_blank"
          >
            <Button variant="contained">{t('account.billing.upgradePlan')}</Button>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <GenericTable
          items={invoices || []}
          count={invoices ? invoices.length : 0}
          columns={[
            {
              key: 'created_at',
              label: t('account.billing.invoiceDate'),
              render: (value: any) => value ? format(new Date(value), 'dd MMM yyyy') : 'N/A',
            },
            {
              key: 'total_paid',
              label: t('account.billing.invoiceTotal'),
              render: (value: any) => numeral(value).format('$0,0.00'),
            },
            {
              key: 'billing_information',
              label: t('account.billing.invoiceBillingInfo'),
              render: (value: any) => value && value.card_number ? `**** ${String(value.card_number).slice(-4)}` : 'N/A',
            },
            {
              key: 'client',
              label: t('account.billing.invoiceClient'),
              render: (value: any) => value && value.name ? value.name : 'N/A',
            },
            {
              key: 'actions',
              label: t('account.billing.invoiceView'),
              render: (_: any, row: any) => (
                <Link color="inherit" underline="always" href="/">
                  {t('account.billing.invoiceView')}
                </Link>
              ),
            },
          ]}
          tableTitle={t('account.billing.invoiceHistoryTitle')}
          tableSubtitle={t('account.billing.invoiceHistorySubheader')}
        />
      </Card>
    </Stack>

  );
}

AccountBillingSettings.propTypes = {
  plan: PropTypes.string.isRequired,
  invoices: PropTypes.array.isRequired,
};
