"use client"

import { useFormik } from "formik"
import * as Yup from "yup"
import { Card, CardContent, TextField, Typography, Grid, Select, MenuItem, InputLabel, FormControl, Switch, FormControlLabel, Checkbox, Stack, Button, } from "@mui/material"
import { type SubscriptionPlan, subscriptionPlanInitialValues, subscriptionPlanValidationSchema } from "src/types/subscription-plan"
import { createSubscriptionPlan, updateSubscriptionPlan } from "src/app/actions/subscription-plans/subscription-plan-actions"
import { LoadingButton } from "@mui/lab"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"
import { notFound, useRouter } from "next/navigation"
import { SubscriptionFormHeader } from "./subscription-form-header"
import { isUUIDv4 } from "src/utils/uuid"
import { BaseEntity, FeatureExtension } from "src/types/base-entity"

interface SubscriptionEditorProps {
     subscriptionStatuses: BaseEntity[]
     features: (BaseEntity & FeatureExtension)[]
     subscriptionPlanData?: SubscriptionPlan
}

export default function SubscriptionEditor({ subscriptionStatuses, features, subscriptionPlanData, }: SubscriptionEditorProps) {

     const { t } = useTranslation()
     const router = useRouter()

     if (subscriptionPlanData?.id && !isUUIDv4(subscriptionPlanData?.id)) {
          notFound()
     }

     const formik = useFormik({
          initialValues: {
               ...subscriptionPlanInitialValues,
               ...subscriptionPlanData,
               base_price_per_month: subscriptionPlanData?.base_price_per_month || 0,
               features: subscriptionPlanData?.features?.map((f: any) => f.id) || [],
          },
          validationSchema: Yup.object().shape({
               ...subscriptionPlanValidationSchema.fields,
          }),
          onSubmit: async (values: SubscriptionPlan) => {
               console.log('values', values);

               try {
                    let response;

                    if (values.id && values.id !== '') {
                         // Update existing subscription plan
                         response = await updateSubscriptionPlan({ ...values, id: subscriptionPlanData!.id });
                         if (response.updateSubscriptionPlanSuccess) {
                              toast.success("Subscription plan updated successfully!");
                              router.push(`/dashboard/subscriptions/${subscriptionPlanData!.id}`);
                         } else {
                              toast.error("Failed to update subscription plan.");
                         }
                    } else {
                         // Create new subscription plan
                         response = await createSubscriptionPlan({ ...values });
                         if (response.createSubscriptionPlanSuccess) {
                              toast.success("Subscription plan created successfully!");
                              router.push(`/dashboard/subscriptions/${response.createdSubscriptionPlan?.id}`);
                         } else {
                              toast.error("Failed to create subscription plan.");
                         }
                    }

                    formik.setSubmitting(false);
               } catch (error) {
                    toast.error("An error occurred while saving the subscription plan.");
                    formik.setSubmitting(false);
                    console.error(error);
               }

          },
     })

     /**
      * Calculates the total price of a subscription plan based on its base price and selected features.
      * It applies discounts if applicable and adjusts for yearly billing.
      *
      * - Adds the base price per month of the subscription plan.
      * - Includes the base price of each selected feature.
      * - Applies a discount if the subscription is marked as discounted.
      * - Calculates the yearly price and applies a yearly discount if the subscription can be billed yearly.
      *
      * @returns {number} The calculated total price of the subscription plan.
      */

     const calculatePrice = () => {
          let totalPrice = Number(formik.values.base_price_per_month) || 0; // Ensure base_price_per_month is a valid number

          // Add prices of selected features
          formik.values.features?.forEach((featureId) => {
               const feature = features.find((f) => f.id === featureId) as (BaseEntity & FeatureExtension) | undefined;
               if (feature) {
                    totalPrice += feature.price_per_month;
               }
          });

          if (formik.values.is_discounted) {
               totalPrice *= 1 - (formik.values.discount_percentage || 0) / 100;
          }

          if (formik.values.is_billed_yearly) {
               totalPrice *= 12; // Calculate yearly price
               totalPrice *= 1 - (formik.values.yearly_discount_percentage || 0) / 100; // Apply yearly discount
          }
          return totalPrice;
     };


     return (
          <form onSubmit={formik.handleSubmit}>
               <SubscriptionFormHeader subscriptionPlan={subscriptionPlanData} />
               <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
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
                                        margin="normal"
                                        multiline
                                        rows={4}
                                   />
                                   <FormControl fullWidth margin="normal">
                                        <InputLabel id="status-label">{t("subscriptionPlans.subscriptionPlanStatus")}</InputLabel>
                                        <Select
                                             labelId="status-label"
                                             id="status_id"
                                             name="status_id"
                                             value={formik.values.status_id}
                                             onChange={formik.handleChange}
                                             label={t("subscriptionPlans.subscriptionPlanStatus")}
                                        >
                                             {subscriptionStatuses.map((status: BaseEntity) => (
                                                  <MenuItem key={status.id} value={status.id}>
                                                       {status.name}
                                                  </MenuItem>
                                             ))}
                                        </Select>
                                   </FormControl>
                                   <TextField
                                        fullWidth
                                        id="base_price_per_month"
                                        name="base_price_per_month"
                                        label={t("subscriptionPlans.subscriptionPlanBasePrice")}
                                        type="number"
                                        value={formik.values.base_price_per_month}
                                        onChange={(event) => {
                                             const value = event.target.value;

                                             // Allow empty string so the user can delete and retype
                                             if (value === "") {
                                                  formik.setFieldValue("base_price_per_month", "");
                                                  return;
                                             }

                                             // Ensure only valid decimal numbers are allowed
                                             if (!isNaN(Number(value))) {
                                                  formik.setFieldValue("base_price_per_month", value).then(() => {
                                                       formik.setFieldValue('total_base_price_per_month', calculatePrice());
                                                  })
                                             }
                                        }}
                                        error={formik.touched.base_price_per_month && Boolean(formik.errors.base_price_per_month)}
                                        helperText={formik.touched.base_price_per_month && formik.errors.base_price_per_month}
                                        margin="normal"
                                        InputProps={{ inputProps: { min: 0, max: 1000000, step: "0.01" } }}
                                        onBlur={() => {
                                             let value = formik.values.base_price_per_month;

                                             // If the field is empty, set it to 0
                                             if (value === parseFloat("") || value === null || value === undefined) {
                                                  value = 0;
                                             } else {
                                                  // Convert to float and ensure two decimal places
                                                  value = Math.max(0, Math.min(1000000, value));
                                                  value = parseFloat(value.toFixed(2));
                                             }

                                             formik.setFieldValue("base_price_per_month", value).then(() => {
                                                  formik.setFieldValue('total_base_price_per_month', calculatePrice());
                                             })
                                        }}
                                   />
                              </CardContent>
                         </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
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
                                             // Determine if the feature is checked using only Formik state
                                             const isChecked = formik.values.features?.includes(featureId);

                                             return (
                                                  <FormControlLabel
                                                       key={featureId}
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
                                                       label={`${feature.name} ($${feature.price_per_month.toFixed(2)}/month)`}
                                                  />
                                             );
                                        })}
                              </CardContent>
                         </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                         <Card>
                              <CardContent>
                                   <Typography variant="h6" gutterBottom>
                                        {t("subscriptionPlans.subscriptionPlanPricingOptions")}
                                   </Typography>
                                   <FormControlLabel
                                        control={
                                             <Switch
                                                  id="is_billed_yearly"
                                                  name="is_billed_yearly"
                                                  checked={formik.values.is_billed_yearly}
                                                  onChange={(event) => {
                                                       formik.handleChange(event);
                                                       if (!event.target.checked) {
                                                            formik.setFieldValue("yearly_discount_percentage", 0);
                                                       }
                                                  }}
                                             />
                                        }
                                        label={t("subscriptionPlans.subscriptionPlanYearlyBilling")}
                                   />
                                   {formik.values.is_billed_yearly && (
                                        <TextField
                                             fullWidth
                                             id="yearly_discount_percentage"
                                             name="yearly_discount_percentage"
                                             label={t("subscriptionPlans.subscriptionPlanYearlyDiscount")}
                                             type="number"
                                             value={formik.values.yearly_discount_percentage}
                                             onChange={(event) => {
                                                  let value = event.target.value;

                                                  // Allow empty input temporarily so users can delete and retype
                                                  if (value === "") {
                                                       formik.setFieldValue("yearly_discount_percentage", "")
                                                       return;
                                                  }

                                                  // Convert to a number and ensure it's within the range 0-100
                                                  let numberValue = Number(value);

                                                  if (isNaN(numberValue) || numberValue < 0 || numberValue > 100) {
                                                       numberValue = 0; // Set to 0 if it's invalid
                                                  }

                                                  formik.setFieldValue("yearly_discount_percentage", numberValue).then(() => {
                                                       formik.setFieldValue('total_base_price_per_month', calculatePrice());
                                                  })
                                             }}
                                             error={formik.touched.yearly_discount_percentage && Boolean(formik.errors.yearly_discount_percentage)}
                                             helperText={formik.touched.yearly_discount_percentage && formik.errors.yearly_discount_percentage}
                                             margin="normal"
                                             InputProps={{ inputProps: { min: 0, max: 100 } }}
                                             onBlur={() => {
                                                  let value = formik.values.yearly_discount_percentage;

                                                  // If input is empty, set it to 0
                                                  if (value === null || value === undefined) {
                                                       value = 0;
                                                  } else {
                                                       value = Math.max(0, Math.min(100, Number(value))); // Ensure within range
                                                  }

                                                  formik.setFieldValue("yearly_discount_percentage", value).then(() => {
                                                       formik.setFieldValue('total_base_price_per_month', calculatePrice());
                                                  })
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

                                                  formik.setFieldValue("discount_percentage", numberValue).then(() => {
                                                       formik.setFieldValue('total_base_price_per_month', calculatePrice());
                                                  })
                                             }}
                                             error={formik.touched.discount_percentage && Boolean(formik.errors.discount_percentage)}
                                             helperText={formik.touched.discount_percentage && formik.errors.discount_percentage}
                                             margin="normal"
                                             InputProps={{ inputProps: { min: 0, max: 100 } }}
                                             onBlur={() => {
                                                  let value = formik.values.discount_percentage;

                                                  // If input is empty, set it to 0
                                                  if (value === null || value === undefined) {
                                                       value = 0;
                                                  } else {
                                                       value = Math.max(0, Math.min(100, Number(value))); // Ensure within range
                                                  }

                                                  formik.setFieldValue("discount_percentage", value).then(() => {
                                                       formik.setFieldValue('total_base_price_per_month', calculatePrice());
                                                  })
                                             }}
                                        />

                                   )}
                                   <Typography variant="h5" className="mt-4">
                                        Total Price: ${calculatePrice().toFixed(2)}
                                        {formik.values.is_billed_yearly ? " " + t("subscriptionPlans.subscriptionPlanYearly") : " " + t("subscriptionPlans.subscriptionPlanMonthly")}
                                   </Typography>
                              </CardContent>
                         </Card>
                    </Grid>
                    <Grid item xs={12}>
                         <LoadingButton
                              loading={formik.isSubmitting}
                              type="submit"
                              variant="contained"
                              color="primary"
                              disabled={!formik.isValid || formik.isSubmitting || !formik.dirty}
                         >
                              {t("common.btnSave")}
                         </LoadingButton>
                    </Grid>
               </Grid>
          </form>
     )
}

