"use client";

import { useMemo, useState, type FC, useCallback } from 'react';
import { Box, Button, SvgIcon, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useTranslation } from 'react-i18next';
import { PolarProduct } from 'src/types/polar-product-types';
import { GenericTable } from 'src/components/generic-table';
import { SearchAndBooleanFilters } from 'src/components/filter-list-search';
import { deleteSubscriptionPlansByIds } from 'src/app/actions/subscription-plan/subscription-plan-actions';
import { toast } from 'react-hot-toast';

interface SubscriptionListTableProps { subscriptionPlans?: PolarProduct[]; }

export const SubscriptionTable: FC<SubscriptionListTableProps> = ({ subscriptionPlans = [] }) => {
     const { t } = useTranslation();
     const [filters, setFilters] = useState<{ search?: string; archived?: string; recurring?: string }>({});
     const [page, setPage] = useState(0);
     const [deletingIds, setDeletingIds] = useState<string[]>([]);

     const handleFiltersChange = useCallback((newFilters: typeof filters) => {
          setFilters(newFilters);
          setPage(0);
     }, []);

     const filtered = useMemo(() => {
          const search = filters.search?.toLowerCase().trim();
          return subscriptionPlans.filter(p => {
               if (filters.archived) {
                    const want = filters.archived === 'true';
                    if (p.is_archived !== want) return false;
               }
               if (filters.recurring) {
                    const want = filters.recurring === 'true';
                    if (p.is_recurring !== want) return false;
               }
               if (search) {
                    const normName = p.name?.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '') || '';
                    const normDesc = p.description?.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '') || '';
                    const normSearch = search.normalize('NFD').replace(/\p{Diacritic}/gu, '');
                    if (!normName.includes(normSearch) && !normDesc.includes(normSearch)) return false;
               }
               return true;
          });
     }, [subscriptionPlans, filters]);

     const formatPrice = (product: PolarProduct) => {
          if (!product.prices || product.prices.length === 0) return 'N/A';
          const price = product.prices[0];
          const amount = (price.price_amount / 100).toFixed(2);
          return `${price.price_currency} ${amount}`;
     };

     const formatInterval = (product: PolarProduct) => {
          if (!product.is_recurring) return t('subscriptionPlans.oneTime');
          const count = product.recurring_interval_count;
          const interval = product.recurring_interval;
          return count === 1 ? t(`subscriptionPlans.interval.${interval}`) : `${count} ${t(`subscriptionPlans.interval.${interval}s`)}`;
     };

     return (
          <Box sx={{ position: 'relative' }}>
               <SearchAndBooleanFilters
                    value={filters}
                    onChange={handleFiltersChange}
                    selects={[
                         {
                              field: 'archived',
                              label: 'subscriptionPlans.archived',
                              options: [
                                   { value: 'true', label: 'common.lblYes' },
                                   { value: 'false', label: 'common.lblNo' }
                              ]
                         },
                         {
                              field: 'recurring',
                              label: 'subscriptionPlans.recurring',
                              options: [
                                   { value: 'true', label: 'common.lblYes' },
                                   { value: 'false', label: 'common.lblNo' }
                              ]
                         }
                    ]}
               />
               <GenericTable<PolarProduct>
                    items={filtered}
                    baseUrl="/dashboard/subscriptions"
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    count={filtered.length}
                    columns={[
                         { key: 'name', label: t('subscriptionPlans.productName') },
                         { key: 'description', label: t('subscriptionPlans.description') },
                         {
                              key: 'prices',
                              label: t('subscriptionPlans.price'),
                              render: (_, product) => formatPrice(product)
                         },
                         {
                              key: 'recurring_interval',
                              label: t('subscriptionPlans.billingInterval'),
                              render: (_, product) => formatInterval(product)
                         },
                         {
                              key: 'is_recurring',
                              label: t('subscriptionPlans.recurring'),
                              render: (value: any) => (
                                   <SvgIcon>{value ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />}</SvgIcon>
                              )
                         },
                         {
                              key: 'is_archived',
                              label: t('subscriptionPlans.archived'),
                              render: (value: any) => (
                                   value ? <Chip label={t('common.archived')} color="default" size="small" /> : <Chip label={t('common.active')} color="success" size="small" />
                              )
                         }
                    ]}
                    rowActions={[
                         (plan, openDialog) => (
                              <Button
                                   color="error"
                                   variant="outlined"
                                   size="small"
                                   loading={deletingIds.includes(plan.id!)}
                                   disabled={deletingIds.length > 0}
                                   onClick={() => openDialog({
                                        id: plan.id!,
                                        title: t('warning.deleteWarningTitle'),
                                        message: t('warning.deleteWarningMessage'),
                                        confirmText: t('common.btnDelete'),
                                        cancelText: t('common.btnClose'),
                                        onConfirm: async () => {
                                             setDeletingIds(prev => [...prev, plan.id!]);
                                             const res = await deleteSubscriptionPlansByIds([plan.id!]);
                                             if (res.deleteSubscriptionPlansSuccess) {
                                                  toast.success(t('common.actionDeleteSuccess'));
                                             } else {
                                                  toast.error(t('common.actionDeleteError'));
                                             }
                                             setDeletingIds(prev => prev.filter(id => id !== plan.id));
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
