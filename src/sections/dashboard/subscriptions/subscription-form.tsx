"use client"

import { useFormik } from "formik"
import * as Yup from "yup"
import { Card, CardContent, TextField, Typography, Grid, Select, MenuItem, InputLabel, FormControl, Switch, FormControlLabel, Checkbox, Stack, Button, } from "@mui/material"
import type { BaseEntity } from "src/app/actions/base-entity-actions"
import { type SubscriptionPlan, subscriptionPlanInitialValues, subscriptionPlanValidationSchema } from "src/types/subscription-plan"
import { createSubscriptionPlan, updateSubscriptionPlan } from "src/app/actions/subscription-plans/subscription-plan-actions"
import { LoadingButton } from "@mui/lab"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { SubscriptionFormHeader } from "./subscription-form-header"

interface SubscriptionEditorProps {
     subscriptionStatuses: BaseEntity[]
     features: (BaseEntity & { base_price: number })[]
     subscriptionPlanData?: SubscriptionPlan
}

export default function SubscriptionEditor({ subscriptionStatuses, features, subscriptionPlanData, }: SubscriptionEditorProps) {

     const { t } = useTranslation()
     const router = useRouter()

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

     const calculatePrice = () => {
          let totalPrice = Number(formik.values.base_price_per_month) || 0; // Ensure base_price is a valid number

          // Add prices of selected features
          formik.values.features?.forEach((featureId) => {
               const feature = features.find((f) => f.id === featureId) as (BaseEntity & { base_price_per_month: number }) | undefined;
               if (feature) {
                    totalPrice += feature.base_price_per_month;
               }
          });

          if (formik.values.is_discounted) {
               totalPrice *= 1 - (formik.values.discount_percentage || 0) / 100;
          }

          if (formik.values.can_bill_yearly) {
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
                                        label="Subscription Name"
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
                                        label="Description"
                                        value={formik.values.description}
                                        onChange={formik.handleChange}
                                        error={formik.touched.description && Boolean(formik.errors.description)}
                                        helperText={formik.touched.description && formik.errors.description}
                                        margin="normal"
                                        multiline
                                        rows={4}
                                   />
                                   <FormControl fullWidth margin="normal">
                                        <InputLabel id="status-label">Status</InputLabel>
                                        <Select
                                             labelId="status-label"
                                             id="status_id"
                                             name="status_id"
                                             value={formik.values.status_id}
                                             onChange={formik.handleChange}
                                             label="Status"
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
                                        id="base_price"
                                        name="base_price"
                                        label="Base Price"
                                        type="number"
                                        value={formik.values.base_price_per_month}
                                        onChange={(event) => {
                                             const value = event.target.value;

                                             // Allow empty string so the user can delete and retype
                                             if (value === "") {
                                                  formik.setFieldValue("base_price", "");
                                                  return;
                                             }

                                             // Ensure only valid decimal numbers are allowed
                                             if (!isNaN(Number(value))) {
                                                  formik.setFieldValue("base_price", value);
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

                                             formik.setFieldValue("base_price", value);
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
                                             {formik.values.features?.length === features.length ? "Deselect All" : "Select All"}
                                        </Button>
                                   </Stack>
                                   {features?.length > 0 &&
                                        features.map((feature: any) => {
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
                                                       label={`${feature.name} ($${feature.base_price_per_month.toFixed(2)}/month)`}
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
                                        Pricing Options
                                   </Typography>
                                   <FormControlLabel
                                        control={
                                             <Switch
                                                  id="can_bill_yearly"
                                                  name="can_bill_yearly"
                                                  checked={formik.values.can_bill_yearly}
                                                  onChange={(event) => {
                                                       formik.handleChange(event);
                                                       if (!event.target.checked) {
                                                            formik.setFieldValue("yearly_discount_percentage", 0);
                                                       }
                                                  }}
                                             />
                                        }
                                        label="Yearly Billing"
                                   />
                                   {formik.values.can_bill_yearly && (
                                        <TextField
                                             fullWidth
                                             id="yearly_discount_percentage"
                                             name="yearly_discount_percentage"
                                             label="Yearly Discount Percentage"
                                             type="number"
                                             value={formik.values.yearly_discount_percentage}
                                             onChange={(event) => {
                                                  let value = event.target.value;

                                                  // Allow empty input temporarily so users can delete and retype
                                                  if (value === "") {
                                                       formik.setFieldValue("yearly_discount_percentage", "");
                                                       return;
                                                  }

                                                  // Convert to a number and ensure it's within the range 0-100
                                                  let numberValue = Number(value);

                                                  if (isNaN(numberValue) || numberValue < 0 || numberValue > 100) {
                                                       numberValue = 0; // Set to 0 if it's invalid
                                                  }

                                                  formik.setFieldValue("yearly_discount_percentage", numberValue);
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

                                                  formik.setFieldValue("yearly_discount_percentage", value);
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
                                        label="Apply Additional Discount"
                                   />
                                   {formik.values.is_discounted && (
                                        <TextField
                                             fullWidth
                                             id="discount_percentage"
                                             name="discount_percentage"
                                             label="Discount Percentage"
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

                                                  formik.setFieldValue("discount_percentage", numberValue);
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

                                                  formik.setFieldValue("discount_percentage", value);
                                             }}
                                        />

                                   )}
                                   <Typography variant="h5" className="mt-4">
                                        Total Price: ${calculatePrice().toFixed(2)}
                                        {formik.values.can_bill_yearly ? " per year" : " per month"}
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
                              Save Subscription
                         </LoadingButton>
                    </Grid>
               </Grid>
          </form>
     )
}

