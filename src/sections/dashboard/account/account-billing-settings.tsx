import type { FC } from 'react';
import { useState } from 'react';
import numeral from 'numeral';
import LinkIcon from '@mui/icons-material/Link';
import { format } from 'date-fns';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
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
  // Ensure invoices have a non-optional id (GenericTable constraint) by falling back to invoice_number
  const normalizedInvoices = (invoices || []).map((inv) => ({
    ...inv,
    id: inv.id || inv.invoice_number
  }));
  type NormalizedInvoice = typeof normalizedInvoices[number];
  const [selectedPlan, setSelectedPlan] = useState<string>(currentPlan);
  const { t } = useTranslation();

  const handleDelete = async (id: string) => {
    const { deleteClientBillingInformationSuccess, deleteClientBillingInformationError } = await deleteClientBillingInformation([id]);
    if (deleteClientBillingInformationSuccess) {
      toast.success(t('account.billing.deleteSuccess'));
    } else {
      toast.error(deleteClientBillingInformationError?.message!);
    }
  };

  return (
    <Stack spacing={4} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden', px: { xs: 0, sm: 0 } }}>
      <Card>
        <CardHeader
          title={t('account.billing.changePlanTitle')}
          subheader={t('account.billing.changePlanSubheader')}
        />
        <CardContent sx={{ pt: 0, px: { xs: 2, sm: 3 }, width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
          {/* Unified Subscription Plans */}
          <Box sx={{ mb: 3 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(auto-fit, minmax(260px, 1fr))' },
                gap: 2,
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                overflowX: 'hidden',
              }}
            >
              {subscriptionPlans && subscriptionPlans.map((plan: SubscriptionPlan, index: number) => {
                const isSelected = plan.id === selectedPlan;
                const isCurrent = plan.id === currentPlan;
                const price = numeral(plan.total_price_per_apartment_with_discounts).format('$0,0.00');
                return (
                  <Box
                    key={index}
                    onClick={() => setSelectedPlan(plan.id!)}
                    sx={{
                      width: '100%',
                      maxWidth: '100%',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      p: 2,
                      border: '1px solid',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: { md: 300, lg: 340 },
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      boxShadow: isSelected ? 4 : 0,
                      '&:hover': { boxShadow: 3 },
                      backgroundColor: isSelected ? 'action.selected' : 'background.paper'
                    }}
                  >
                    <Box sx={{ height: 52, width: 52, '& img': { height: 'auto', width: '100%' } }}>
                      {plan.total_price_per_apartment_with_discounts >= 0 && plan.total_price_per_apartment_with_discounts < 300 ? (
                        <AccountPlanIcon name='startup' />
                      ) : plan.total_price_per_apartment_with_discounts >= 300 && plan.total_price_per_apartment_with_discounts < 400 ? (
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
                    <Box sx={{ mt: 2, flexGrow: 1 }}>
                      {plan && plan.features && plan.features.length > 0 ? (
                        <Stack spacing={0.5} sx={{ height: '100%' }}>
                          {plan.features?.map((feature, index) => (
                            <Typography
                              key={index}
                              variant="body2"
                              color="text.secondary"
                              sx={{ wordBreak: 'break-word' }}
                            >
                              {feature}
                            </Typography>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {t('account.billing.noFeatures')}
                        </Typography>
                      )}
                    </Box>
                    {!isCurrent && (
                      <Button
                        endIcon={<LinkIcon fontSize="small" />}
                        href={'https://nest-link.app/pricing'}
                        rel="noopener noreferrer"
                        target="_blank"
                        variant="text"
                        sx={{ mt: 2, alignSelf: 'flex-start' }}
                      >
                        {t('account.billing.upgradeNow')}
                      </Button>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
          <Divider sx={{ my: 3 }} />
          {/* Billing Information Table */}
          {billingInfo && billingInfo.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ width: '100%', overflowX: 'auto', boxSizing: 'border-box', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', '&::-webkit-scrollbar': { height: 8 }, '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 4 }, '& .MuiTable-root': { minWidth: 760 } }}>
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
                      render: (value: any) => value ? `${value.split(',')[0]?.trim()}, ${value.split(',')[1]?.trim()}, ${value.split(',')[3] ? value.split(',')[3]?.trim() : ''}` : 'N/A'
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
                  tableTitle={t('account.billingTableTitle')}
                  tableSubtitle={t('account.billingTableSubtitle')}
                />
              </Box>
            </Box>
          )}
          <Divider sx={{ my: 3 }} />
          {/* Invoices Table */}
          <Box sx={{ width: '100%', overflowX: 'auto', boxSizing: 'border-box', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', '&::-webkit-scrollbar': { height: 8 }, '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 4 }, '& .MuiTable-root': { minWidth: 900 } }}>
            <GenericTable<NormalizedInvoice>
              items={normalizedInvoices}
              count={normalizedInvoices.length}
              columns={[
                { key: 'created_at', label: t('account.billing.invoiceDate'), render: (value: any) => value ? format(new Date(value), 'dd MMM yyyy') : 'N/A' },
                { key: 'invoice_number', label: t('account.billing.invoiceNumber', 'Invoice #') },
                { key: 'total_paid', label: t('account.billing.invoiceTotal'), render: (value: any) => numeral(value).format('$0,0.00') },
                { key: 'billing_information', label: t('account.billing.invoiceBillingInfo'), render: (value: any) => value && value.card_number ? `**** ${String(value.card_number).slice(-4)}` : 'N/A' },
                { key: 'client', label: t('account.billing.invoiceClient'), render: (value: any) => value && value.name ? value.name : 'N/A' }
              ]}
              rowActions={[
                (invoice) => (
                  <Link
                    href={invoice.invoice_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="always"
                  >
                    {t('account.billing.invoiceView')}
                  </Link>
                )
              ]}
              tableTitle={t('account.billing.invoiceHistoryTitle')}
              tableSubtitle={t('account.billing.invoiceHistorySubheader')}
            />
          </Box>
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
    </Stack>
  );
};

