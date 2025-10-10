"use client";

import { useMemo, useState, type FC, useCallback } from 'react';
import { Box, Button, SvgIcon } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useTranslation } from 'react-i18next';
import { SubscriptionPlan, subscriptionPlanStatusOptions } from 'src/types/subscription-plan';
import { GenericTable } from 'src/components/generic-table';
import { SearchAndBooleanFilters } from 'src/components/filter-list-search';
import { deleteSubscriptionPlansByIds } from 'src/app/actions/subscription-plan/subscription-plan-actions';
import { toast } from 'react-hot-toast';

interface SubscriptionListTableProps { subscriptionPlans?: SubscriptionPlan[]; }

export const SubscriptionTable: FC<SubscriptionListTableProps> = ({ subscriptionPlans = [] }) => {
     const { t } = useTranslation();
     const [filters, setFilters] = useState<{ search?: string; status?: string; billed_annually?: string; discounted?: string }>({});
     const [deletingIds, setDeletingIds] = useState<string[]>([]);

     const handleFiltersChange = useCallback((newFilters: typeof filters) => {
          setFilters(newFilters);
     }, []);

     const filtered = useMemo(() => {
          const search = filters.search?.toLowerCase().trim();
          return subscriptionPlans.filter(p => {
               if (filters.status && p.status !== filters.status) return false;
               if (filters.billed_annually) {
                    const want = filters.billed_annually === 'true';
                    if (p.is_billed_annually !== want) return false;
               }
               if (filters.discounted) {
                    const want = filters.discounted === 'true';
                    if (p.is_discounted !== want) return false;
               }
               if (search) {
                    const hay = [p.name, p.description, p.id].filter(Boolean).map(v => String(v).toLowerCase()).join(' ');
                    if (!hay.includes(search)) return false;
               }
               return true;
          });
     }, [subscriptionPlans, filters]);

     return (
          <Box sx={{ position: 'relative' }}>
               <SearchAndBooleanFilters
                    value={filters}
                    onChange={handleFiltersChange}
                    selects={[
                         {
                              field: 'status',
                              label: 'subscriptionPlans.subscriptionPlanStatus',
                              options: subscriptionPlanStatusOptions.map(o => ({ value: o.value, label: o.label }))
                         },
                         {
                              field: 'billed_annually',
                              label: 'subscriptionPlans.subscriptionPlanYearlyBilling',
                              options: [
                                   { value: 'true', label: 'common.lblYes' },
                                   { value: 'false', label: 'common.lblNo' }
                              ]
                         },
                         {
                              field: 'discounted',
                              label: 'subscriptionPlans.subscriptionPlanIsDiscounted',
                              options: [
                                   { value: 'true', label: 'common.lblYes' },
                                   { value: 'false', label: 'common.lblNo' }
                              ]
                         }
                    ]}
               />
               <GenericTable<SubscriptionPlan>
                    items={filtered}
                    baseUrl="/dashboard/subscriptions"
                    columns={[
                         { key: 'name', label: t('subscriptionPlans.subscriptionPlanName') },
                         {
                              key: 'status',
                              label: t('subscriptionPlans.subscriptionPlanStatus'),
                              render: (v) => t(subscriptionPlanStatusOptions.find(s => s.value === v)?.label || '')
                         },
                         { key: 'base_price', label: t('subscriptionPlans.subscriptionPlanBasePrice') },
                         {
                              key: 'is_billed_annually',
                              label: t('subscriptionPlans.subscriptionPlanYearlyBilling'),
                              render: (value: any) => (
                                   <SvgIcon>{value ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />}</SvgIcon>
                              )
                         },
                         { key: 'annual_discount_percentage', label: t('subscriptionPlans.subscriptionPlanYearlyDiscount') },
                         {
                              key: 'is_discounted',
                              label: t('subscriptionPlans.subscriptionPlanIsDiscounted'),
                              render: (value: any) => (
                                   <SvgIcon>{value ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />}</SvgIcon>
                              )
                         },
                         { key: 'discount_percentage', label: t('subscriptionPlans.subscriptionPlanDiscountPercentage') },
                         { key: 'monthly_total_price', label: t('subscriptionPlans.subscriptionPlanTotalPrice') }
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
                                                  toast.success(t('common.deleteSuccess'));
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
