"use client"

import { Form, Formik, useFormik } from "formik"
import * as Yup from "yup"
import { Card, CardContent, TextField, Typography, Grid, Select, MenuItem, InputLabel, FormControl, Switch, FormControlLabel, Checkbox, Stack, Button, Box, } from "@mui/material"
import SaveIcon from "@mui/icons-material/Save"
import { type SubscriptionPlan, subscriptionPlanInitialValues, subscriptionPlanValidationSchema } from "src/types/subscription-plan"
import { createSubscriptionPlan, updateSubscriptionPlan } from "src/app/actions/subscription-plans/subscription-plan-actions"
import { LoadingButton } from "@mui/lab"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"
import { notFound, useRouter } from "next/navigation"
import { SubscriptionFormHeader } from "./subscription-form-header"
import { isUUIDv4 } from "src/utils/uuid"
import { BaseEntity, FeatureExtension } from "src/types/base-entity"
import { updateFeature } from "src/app/actions/feature/feature-actions"
import { useState } from "react"

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
               base_price: subscriptionPlanData?.base_price || 0,
               features: subscriptionPlanData?.features?.map((f: any) => f.id) || [],
          },
          validationSchema: Yup.object().shape({
               ...subscriptionPlanValidationSchema.fields,
          }),
          onSubmit: async (values: SubscriptionPlan) => {
               const total_price = getCalculatedTotalPrice(values, featurePrices);

               const payload = {
                    ...values,
                    total_price,
               };

               try {
                    let response;
                    if (values.id && values.id !== '') {
                         response = await updateSubscriptionPlan({ ...payload, id: subscriptionPlanData!.id });
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
     })
     const getCalculatedTotalPrice = (values: SubscriptionPlan, prices: Record<string, number>) => {
          let totalPrice = Number(values.base_price) || 0;

          values.features?.forEach((featureId) => {
               const featurePrice = prices[featureId];
               if (!isNaN(featurePrice)) {
                    totalPrice += featurePrice;
               }
          });

          if (values.is_discounted) {
               totalPrice *= 1 - (values.discount_percentage || 0) / 100;
          }

          if (values.is_billed_annually) {
               totalPrice *= 12;
               totalPrice *= 1 - (values.yearly_discount_percentage || 0) / 100;
          }

          return parseFloat(totalPrice.toFixed(2));
     };

     const calculatePrice = () => getCalculatedTotalPrice(formik.values, featurePrices);


     const [featurePrices, setFeaturePrices] = useState<Record<string, number>>(
          Object.fromEntries(features.map((f) => [f.id!, f.price_per_month]))
     );

     const handleFeaturePriceChange = (featureId: string, price: number) => {
          setFeaturePrices((prev) => ({ ...prev, [featureId]: price }));
     };

     const handleFeaturePriceSave = async (featureId: string) => {
          const price = featurePrices[featureId];
          const { success } = await updateFeature(featureId, { price_per_month: price });

          if (success) {
               toast.success("Feature price updated successfully!");

               const newTotal = getCalculatedTotalPrice(formik.values, featurePrices);

               await updateSubscriptionPlan({
                    ...formik.values,
                    id: subscriptionPlanData!.id,
                    total_price: newTotal,
               });
          } else {
               toast.error("Failed to update feature price.");
          }
     };


     return (
          <form onSubmit={formik.handleSubmit}>
               <SubscriptionFormHeader subscriptionPlan={subscriptionPlanData} />
               <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
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
                                             id="base_price"
                                             name="base_price"
                                             label={t("subscriptionPlans.subscriptionPlanBasePrice")}
                                             type="number"
                                             value={formik.values.base_price}
                                             onChange={(event) => {
                                                  const value = event.target.value;

                                                  // Allow empty string so the user can delete and retype
                                                  if (value === "") {
                                                       formik.setFieldValue("base_price", "");
                                                       return;
                                                  }

                                                  // Ensure only valid decimal numbers are allowed
                                                  if (!isNaN(Number(value))) {
                                                       formik.setFieldValue("base_price", value).then(() => {
                                                            formik.setFieldValue('total_price', calculatePrice());
                                                       })
                                                  }
                                             }}
                                             error={formik.touched.base_price && Boolean(formik.errors.base_price)}
                                             helperText={formik.touched.base_price && formik.errors.base_price}
                                             margin="normal"
                                             InputProps={{ inputProps: { min: 0, max: 1000000, step: "0.01" } }}
                                             onBlur={() => {
                                                  let value = formik.values.base_price;

                                                  // If the field is empty, set it to 0
                                                  if (value === parseFloat("") || value === null || value === undefined) {
                                                       value = 0;
                                                  } else {
                                                       // Convert to float and ensure two decimal places
                                                       value = Math.max(0, Math.min(1000000, value));
                                                       value = parseFloat(value.toFixed(2));
                                                  }

                                                  formik.setFieldValue("base_price", value).then(() => {
                                                       formik.setFieldValue('total_price', calculatePrice());
                                                  })
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
                                                                 formik.setFieldValue("yearly_discount_percentage", 0);
                                                            }
                                                       }}
                                                  />
                                             }
                                             label={t("subscriptionPlans.subscriptionPlanYearlyBilling")}
                                        />
                                        {formik.values.is_billed_annually && (
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
                                                            formik.setFieldValue('total_price', calculatePrice());
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
                                                            formik.setFieldValue('total_price', calculatePrice());
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
                                                            formik.setFieldValue('total_price', calculatePrice());
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
                                                            formik.setFieldValue('total_price', calculatePrice());
                                                       })
                                                  }}
                                             />

                                        )}
                                        <Typography variant="h5" className="mt-4">
                                             Total Price: ${calculatePrice().toFixed(2)}
                                             {formik.values.is_billed_annually ? " " + t("subscriptionPlans.subscriptionPlanYearly") : " " + t("subscriptionPlans.subscriptionPlanMonthly")}
                                        </Typography>
                                   </CardContent>
                              </Card>
                         </Stack >
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
                                             const isChecked = formik.values.features?.includes(featureId);
                                             const price = featurePrices[featureId] ?? 0;

                                             return (
                                                  <Box
                                                       key={featureId}
                                                       display="flex"
                                                       alignItems="center"
                                                       justifyContent="space-between"
                                                       mb={2}
                                                  >
                                                       {/* Label + Checkbox on the left */}
                                                       <FormControlLabel
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
                                                            label={feature.name}
                                                       />

                                                       {/* Price input + Save button on the right */}
                                                       <Stack direction="row" spacing={1} alignItems="center">
                                                            <TextField
                                                                 type="number"
                                                                 value={price}
                                                                 onChange={(e) => {
                                                                      const val = parseFloat(e.target.value);
                                                                      if (!isNaN(val)) {
                                                                           handleFeaturePriceChange(featureId, val);
                                                                      }
                                                                 }}
                                                                 inputProps={{ step: "0.01", min: 0 }}
                                                                 size="small"
                                                                 sx={{ width: 80 }} // smaller text box
                                                                 disabled={!isChecked}
                                                            />
                                                            <LoadingButton
                                                                 variant="contained"
                                                                 size="small"
                                                                 startIcon={<SaveIcon />}
                                                                 onClick={() => handleFeaturePriceSave(featureId)}
                                                                 disabled={!isChecked || price === feature.price_per_month}
                                                            >
                                                                 Save
                                                            </LoadingButton>
                                                       </Stack>
                                                  </Box>

                                             );
                                        })}


                              </CardContent>
                         </Card>
                    </Grid>
                    <Grid item xs={12} >
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
               </Grid >
          </form >
     )
}

