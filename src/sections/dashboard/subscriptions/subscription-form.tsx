"use client"

import { useFormik } from "formik"
import * as Yup from "yup"
import { Card, CardContent, TextField, Typography, Grid, Select, MenuItem, InputLabel, FormControl, Switch, FormControlLabel, Checkbox, Stack, Button, Box } from "@mui/material"
import SaveIcon from "@mui/icons-material/Save"
import { type SubscriptionPlan, subscriptionPlanInitialValues, subscriptionPlanStatusOptions, subscriptionPlanValidationSchema } from "src/types/subscription-plan"
import { createSubscriptionPlan, updateSubscriptionPlan } from "src/app/actions/subscription-plan/subscription-plan-actions"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"
import { notFound, useRouter } from "next/navigation"
import { SubscriptionFormHeader } from "./subscription-form-header"
import { isUUIDv4 } from "src/utils/uuid"
import { BaseEntity, FeatureExtension } from "src/types/base-entity"
import { updateFeaturePrice } from "src/app/actions/feature/feature-actions"
import { useState, useCallback, useEffect, useMemo } from "react"

interface SubscriptionEditorProps {
     features: (BaseEntity & FeatureExtension)[]
     subscriptionPlansData?: SubscriptionPlan
}

// Helper to compute pricing based on current form values & feature prices
const getCalculatedPrices = (values: SubscriptionPlan, prices: Record<string, number>) => {
     let baseTotal = Number(values.base_price) || 0;
     values.features?.forEach((featureId: any) => {
          const featurePrice = prices[featureId];
          if (!isNaN(featurePrice)) baseTotal += featurePrice;
     });
     const monthly_total_price_per_apartment = parseFloat(baseTotal.toFixed(2));
     let discountedPrice = monthly_total_price_per_apartment;
     if (values.is_discounted) discountedPrice *= 1 - (values.discount_percentage || 0) / 100;
     if (values.is_billed_annually) {
          discountedPrice *= 12;
          discountedPrice *= 1 - (values.annual_discount_percentage || 0) / 100;
     }
     const total_price_per_apartment_with_discounts = parseFloat(discountedPrice.toFixed(2));
     return { monthly_total_price_per_apartment, total_price_per_apartment_with_discounts };
};

export default function SubscriptionEditor({ features, subscriptionPlansData }: SubscriptionEditorProps) {
     const { t } = useTranslation()
     const router = useRouter()

     if (subscriptionPlansData?.id && !isUUIDv4(subscriptionPlansData?.id)) {
          notFound()
     }

     const [featurePrices, setFeaturePrices] = useState<Record<string, number>>(
          Object.fromEntries(features.map((f) => [f.id!, f.price_per_month]))
     );

     const formik = useFormik({
          initialValues: {
               ...subscriptionPlanInitialValues,
               ...subscriptionPlansData,
               base_price: subscriptionPlansData?.base_price || 0,
               features: subscriptionPlansData?.features?.map((f: any) => f.id) || [],
          },
          validationSchema: Yup.object().shape({
               ...subscriptionPlanValidationSchema.fields,
          }),
          onSubmit: async (values: SubscriptionPlan) => {
               const { monthly_total_price_per_apartment, total_price_per_apartment_with_discounts } = getCalculatedPrices(values, featurePrices);
               const payload = { ...values, monthly_total_price_per_apartment, total_price_per_apartment_with_discounts } as SubscriptionPlan;
               try {
                    let response;
                    if (values.id && values.id !== '') {
                         response = await updateSubscriptionPlan({ ...payload, id: subscriptionPlansData!.id });
                         if (response.updateSubscriptionPlanSuccess) {
                              toast.success("Subscription plan updated successfully!");
                              formik.resetForm({ values: { ...formik.values } });
                         } else {
                              toast.error("Failed to update subscription plan.");
                         }
                    } else {
                         response = await createSubscriptionPlan(payload);
                         if (response.createSubscriptionPlanSuccess) {
                              toast.success("Subscription plan created successfully!");
                              router.push(`/dashboard/subscriptions/${response.createdSubscriptionPlan?.id}`);
                         } else {
                              toast.error("Failed to create subscription plan.");
                         }
                    }
               } catch (error) {
                    toast.error("An error occurred while saving the subscription plan.");
               } finally {
                    formik.setSubmitting(false);
               }
          }
     });
     const handleFeaturePriceChange = useCallback((featureId: string, price: number) => {
          setFeaturePrices((prev) => ({ ...prev, [featureId]: price }));
     }, []);

     const handleFeaturePriceSave = useCallback(async (featureId: string) => {
          const price = featurePrices[featureId];
          const { success } = await updateFeaturePrice(featureId, { price_per_month: price });
          if (success) {
               toast.success("Feature price updated successfully!");
               const { monthly_total_price_per_apartment, total_price_per_apartment_with_discounts } = getCalculatedPrices(formik.values, featurePrices);
               if (subscriptionPlansData?.id) {
                    await updateSubscriptionPlan({
                         ...formik.values,
                         id: subscriptionPlansData.id,
                         monthly_total_price_per_apartment,
                         total_price_per_apartment_with_discounts,
                    });
               }
          } else {
               toast.error("Failed to update feature price.");
          }
     }, [featurePrices, formik.values, subscriptionPlansData]);

     // Memoized calculated prices for display
     const memoPrices = useMemo(() => {
          return getCalculatedPrices(formik.values, featurePrices);
          // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [
          formik.values.base_price,
          formik.values.is_discounted,
          formik.values.discount_percentage,
          formik.values.is_billed_annually,
          formik.values.annual_discount_percentage,
          formik.values.features,
          featurePrices
     ]);

     // Debounce updating form fields for monthly_total_price_per_apartment & total_price_per_apartment_with_discounts
     useEffect(() => {
          const timer = setTimeout(() => {
               const { monthly_total_price_per_apartment, total_price_per_apartment_with_discounts } = memoPrices;
               if (formik.values.monthly_total_price_per_apartment !== monthly_total_price_per_apartment) {
                    formik.setFieldValue('monthly_total_price_per_apartment', monthly_total_price_per_apartment, false);
               }
               if (formik.values.total_price_per_apartment_with_discounts !== total_price_per_apartment_with_discounts) {
                    formik.setFieldValue('total_price_per_apartment_with_discounts', total_price_per_apartment_with_discounts, false);
               }
          }, 250);
          return () => clearTimeout(timer);
     }, [memoPrices, formik.values.monthly_total_price_per_apartment, formik.values.total_price_per_apartment_with_discounts, formik.setFieldValue]);

     return (
          <form onSubmit={formik.handleSubmit}>
               <SubscriptionFormHeader subscriptionPlan={subscriptionPlansData} />
               <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                         <Stack spacing={3}>
                              <Card>
                                   <CardContent>
                                        <TextField
                                             fullWidth
                                             id="name"
                                             name="name"
                                             label={t("subscriptionPlans.subscriptionPlanName")}
                                             value={formik.values.name}
                                             onChange={formik.handleChange}
                                             error={formik.touched.name && Boolean(formik.errors.name)}
                                             helperText={formik.touched.name && formik.errors.name}
                                             margin="normal"
                                             onBlur={formik.handleBlur}
                                        />
                                        <TextField
                                             fullWidth
                                             id="description"
                                             name="description"
                                             label={t("subscriptionPlans.subscriptionPlanDescription")}
                                             value={formik.values.description}
                                             onChange={formik.handleChange}
                                             error={formik.touched.description && Boolean(formik.errors.description)}
                                             helperText={formik.touched.description && formik.errors.description}
                                             onBlur={formik.handleBlur}
                                             margin="normal"
                                             multiline
                                             rows={4}
                                        />
                                        <FormControl fullWidth margin="normal">
                                             <InputLabel id="status-label">{t("subscriptionPlans.subscriptionPlanStatus")}</InputLabel>
                                             <Select
                                                  labelId="status-label"
                                                  id="status"
                                                  name="status"
                                                  value={formik.values.status}
                                                  onChange={formik.handleChange}
                                                  label={t("subscriptionPlans.subscriptionPlanStatus")}
                                             >
                                                  {subscriptionPlanStatusOptions.map((status) => (
                                                       <MenuItem key={status.value} value={status.value}>
                                                            {t(status.label)}
                                                       </MenuItem>
                                                  ))}
                                             </Select>
                                        </FormControl>
                                        <TextField
                                             fullWidth
                                             id="max_number_of_apartments"
                                             name="max_number_of_apartments"
                                             label={t("subscriptionPlans.susbcriptionPlanMaxNumberOfAppartments")}
                                             type="number"
                                             value={formik.values.max_number_of_apartments}
                                             onChange={formik.handleChange}
                                             error={formik.touched.max_number_of_apartments && Boolean(formik.errors.max_number_of_apartments)}
                                             helperText={formik.touched.max_number_of_apartments && formik.errors.max_number_of_apartments}
                                             margin="normal"
                                             slotProps={{ htmlInput: { min: 0, max: 1000000, step: "1" } }}
                                             onBlur={formik.handleBlur}
                                        />
                                        <TextField
                                             fullWidth
                                             id="max_number_of_team_members"
                                             name="max_number_of_team_members"
                                             label={t("subscriptionPlans.susbcriptionPlanMaxNumberOfTeamMembers")}
                                             type="number"
                                             value={formik.values.max_number_of_team_members}
                                             onChange={formik.handleChange}
                                             error={formik.touched.max_number_of_team_members && Boolean(formik.errors.max_number_of_team_members)}
                                             helperText={formik.touched.max_number_of_team_members && formik.errors.max_number_of_team_members}
                                             margin="normal"
                                             slotProps={{ htmlInput: { min: 0, max: 1000000, step: "1" } }}
                                             onBlur={formik.handleBlur}
                                        />
                                        <TextField
                                             fullWidth
                                             id="base_price"
                                             name="base_price"
                                             label={t("subscriptionPlans.subscriptionPlanBasePrice")}
                                             type="number"
                                             value={formik.values.base_price}
                                             onChange={(event) => {
                                                  const value = event.target.value;
                                                  if (value === "") { // allow clearing
                                                       formik.setFieldValue("base_price", "");
                                                  } else if (!isNaN(Number(value))) {
                                                       formik.setFieldValue("base_price", value);
                                                  }
                                             }}
                                             error={formik.touched.base_price && Boolean(formik.errors.base_price)}
                                             helperText={formik.touched.base_price && formik.errors.base_price}
                                             margin="normal"
                                             slotProps={{ htmlInput: { min: 0, max: 1000000, step: "0.01" } }}
                                             onBlur={() => {
                                                  let value = formik.values.base_price;
                                                  if (value === parseFloat("") || value === null || value === undefined || value === ('' as any)) {
                                                       value = 0;
                                                  } else {
                                                       value = Math.max(0, Math.min(1000000, Number(value)));
                                                       value = parseFloat((value as number).toFixed(2));
                                                  }
                                                  formik.setFieldValue("base_price", value);
                                             }}
                                        />
                                   </CardContent>
                              </Card>
                              <Card>
                                   <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                             {t("subscriptionPlans.subscriptionPlanPricingOptions")}
                                        </Typography>
                                        <FormControlLabel
                                             control={
                                                  <Switch
                                                       id="is_billed_annually"
                                                       name="is_billed_annually"
                                                       checked={formik.values.is_billed_annually}
                                                       onChange={(event) => {
                                                            formik.handleChange(event);
                                                            if (!event.target.checked) {
                                                                 formik.setFieldValue("annual_discount_percentage", 0);
                                                            }
                                                       }}
                                                  />
                                             }
                                             label={t("subscriptionPlans.subscriptionPlanYearlyBilling")}
                                        />
                                        {formik.values.is_billed_annually && (
                                             <TextField
                                                  fullWidth
                                                  id="annual_discount_percentage"
                                                  name="annual_discount_percentage"
                                                  label={t("subscriptionPlans.subscriptionPlanYearlyDiscount")}
                                                  type="number"
                                                  value={formik.values.annual_discount_percentage}
                                                  onChange={(event) => {
                                                       let value = event.target.value;

                                                       // Allow empty input temporarily so users can delete and retype
                                                       if (value === "") {
                                                            formik.setFieldValue("annual_discount_percentage", "")
                                                            return;
                                                       }

                                                       // Convert to a number and ensure it's within the range 0-100
                                                       let numberValue = Number(value);

                                                       if (isNaN(numberValue) || numberValue < 0 || numberValue > 100) {
                                                            numberValue = 0; // Set to 0 if it's invalid
                                                       }

                                                       formik.setFieldValue("annual_discount_percentage", numberValue)
                                                  }}
                                                  error={formik.touched.annual_discount_percentage && Boolean(formik.errors.annual_discount_percentage)}
                                                  helperText={formik.touched.annual_discount_percentage && formik.errors.annual_discount_percentage}
                                                  margin="normal"
                                                  slotProps={{ htmlInput: { min: 0, max: 100 } }}
                                                  onBlur={() => {
                                                       let value = formik.values.annual_discount_percentage;

                                                       // If input is empty, set it to 0
                                                       if (value === null || value === undefined) {
                                                            value = 0;
                                                       } else {
                                                            value = Math.max(0, Math.min(100, Number(value))); // Ensure within range
                                                       }

                                                       formik.setFieldValue("annual_discount_percentage", value)
                                                  }}
                                             />
                                        )}
                                        <FormControlLabel
                                             control={
                                                  <Switch
                                                       id="is_discounted"
                                                       name="is_discounted"
                                                       checked={formik.values.is_discounted}
                                                       onChange={(event) => {
                                                            formik.handleChange(event);
                                                            if (!event.target.checked) {
                                                                 formik.setFieldValue("discount_percentage", 0);
                                                            }
                                                       }}
                                                  />
                                             }
                                             label={t("subscriptionPlans.subscriptionPlanIsDiscounted")}
                                        />
                                        {formik.values.is_discounted && (
                                             <TextField
                                                  fullWidth
                                                  id="discount_percentage"
                                                  name="discount_percentage"
                                                  label={t("subscriptionPlans.subscriptionPlanDiscountPercentage")}
                                                  type="number"
                                                  value={formik.values.discount_percentage}
                                                  onChange={(event) => {
                                                       let value = event.target.value;

                                                       // Allow empty input temporarily so users can delete and retype
                                                       if (value === "") {
                                                            formik.setFieldValue("discount_percentage", "");
                                                            return;
                                                       }

                                                       // Convert to a number and ensure it's within the range 0-100
                                                       let numberValue = Number(value);

                                                       if (isNaN(numberValue) || numberValue < 0 || numberValue > 100) {
                                                            numberValue = 0; // Set to 0 if it's invalid
                                                       }

                                                       formik.setFieldValue("discount_percentage", numberValue)
                                                  }}
                                                  error={formik.touched.discount_percentage && Boolean(formik.errors.discount_percentage)}
                                                  helperText={formik.touched.discount_percentage && formik.errors.discount_percentage}
                                                  margin="normal"
                                                  slotProps={{ htmlInput: { min: 0, max: 100 } }}
                                                  onBlur={() => {
                                                       let value = formik.values.discount_percentage;

                                                       // If input is empty, set it to 0
                                                       if (value === null || value === undefined) {
                                                            value = 0;
                                                       } else {
                                                            value = Math.max(0, Math.min(100, Number(value))); // Ensure within range
                                                       }

                                                       formik.setFieldValue("discount_percentage", value)
                                                  }}
                                             />

                                        )}
                                        <Typography variant="h5" className="mt-4">
                                             Monthly price per apartment: ${memoPrices.monthly_total_price_per_apartment.toFixed(2)}<br />
                                             Total per apartment with discounts: ${memoPrices.total_price_per_apartment_with_discounts.toFixed(2)}{" "}
                                             {formik.values.is_billed_annually ? t("subscriptionPlans.subscriptionPlanYearly") : t("subscriptionPlans.subscriptionPlanMonthly")}
                                        </Typography>
                                   </CardContent>
                              </Card>
                         </Stack >
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                         <Card>
                              <CardContent>
                                   <Stack direction="row" spacing={5} alignItems="center">
                                        <Typography variant="h6" gutterBottom>
                                             Features
                                        </Typography>
                                        <Button
                                             onClick={() => {
                                                  if (formik.values.features?.length === features.length) {
                                                       formik.setFieldValue("features", []);
                                                  } else {
                                                       formik.setFieldValue("features", features.map((feature: any) => feature.id));
                                                  }
                                             }}
                                        >
                                             {formik.values.features?.length === features.length ? t("common.deselectAll") : t("common.selectAll")}
                                        </Button>
                                   </Stack>
                                   {features?.length > 0 &&
                                        features.map((feature: BaseEntity & FeatureExtension) => {
                                             const featureId = feature.id!;
                                             const isChecked = formik.values.features?.includes(featureId);
                                             const price = featurePrices[featureId] ?? 0;

                                             return (
                                                  <Box
                                                       key={featureId}
                                                       sx={{
                                                            display: 'grid',
                                                            gridTemplateColumns: {
                                                                 xs: '1fr 1fr',
                                                                 sm: '1fr 90px 80px'
                                                            },
                                                            alignItems: 'center',
                                                            gap: 1,
                                                            mb: 2,
                                                       }}
                                                  >
                                                       <FormControlLabel
                                                            sx={{
                                                                 m: 0,
                                                                 pr: 1,
                                                                 alignItems: 'center',
                                                                 gridColumn: { xs: '1 / -1', sm: '1 / 2' },
                                                                 '.MuiFormControlLabel-label': {
                                                                      display: 'inline-block',
                                                                      lineHeight: 1.2,
                                                                      paddingTop: '2px'
                                                                 }
                                                            }}
                                                            control={
                                                                 <Checkbox
                                                                      id={`feature-${featureId}`}
                                                                      name="features"
                                                                      checked={isChecked}
                                                                      onChange={(e) => {
                                                                           const updatedFeatures = e.target.checked
                                                                                ? [...formik.values.features!, featureId]
                                                                                : formik.values.features!.filter((f) => f !== featureId);
                                                                           formik.setFieldValue("features", updatedFeatures);
                                                                      }}
                                                                 />
                                                            }
                                                            label={
                                                                 <Typography
                                                                      variant="body2"
                                                                      sx={{
                                                                           pr: 2,
                                                                           whiteSpace: { xs: 'normal', sm: 'nowrap' },
                                                                           overflow: 'hidden',
                                                                           textOverflow: 'ellipsis',
                                                                      }}
                                                                 >
                                                                      {feature.name}
                                                                 </Typography>
                                                            }
                                                       />
                                                       <TextField
                                                            type="number"
                                                            value={price}
                                                            onChange={(e) => {
                                                                 const val = parseFloat(e.target.value);
                                                                 if (!isNaN(val)) {
                                                                      handleFeaturePriceChange(featureId, val);
                                                                 }
                                                            }}
                                                            slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                                                            size="small"
                                                            sx={{
                                                                 width: { xs: '100%', sm: '90px' },
                                                                 gridColumn: { xs: '1 / 2', sm: '2 / 3' },
                                                                 // Match MUI small button height (~32px)
                                                                 '& .MuiInputBase-root': {
                                                                      height: 35,
                                                                      width: 80,
                                                                      fontSize: 13,
                                                                 },
                                                                 '& input': { textAlign: 'right', fontSize: 13, p: 0, height: '32px !important' },
                                                            }}
                                                            disabled={!isChecked}
                                                       />
                                                       <Button
                                                            variant="contained"
                                                            size="small"
                                                            startIcon={<SaveIcon />}
                                                            onClick={() => handleFeaturePriceSave(featureId)}
                                                            disabled={!isChecked || price === feature.price_per_month}
                                                            sx={{
                                                                 minWidth: { xs: 'auto', sm: 80 },
                                                                 px: 1.5,
                                                                 fontSize: 12,
                                                                 justifySelf: { xs: 'start', sm: 'stretch' },
                                                                 gridColumn: { xs: '2 / 3', sm: '3 / 4' }
                                                            }}
                                                       >
                                                            {t('common.btnSave')}
                                                       </Button>
                                                  </Box>
                                             );
                                        })}


                              </CardContent>
                         </Card>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                         <Button
                              loading={formik.isSubmitting}
                              type="submit"
                              variant="contained"
                              color="primary"
                              disabled={!formik.isValid || formik.isSubmitting || !formik.dirty}
                         >
                              {t("common.btnSave")}
                         </Button>
                    </Grid>
               </Grid >
          </form >
     )
}

