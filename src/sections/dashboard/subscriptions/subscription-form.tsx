"use client"

import { useFormik } from "formik"
import { Card, CardContent, TextField, Typography, Grid, Select, MenuItem, InputLabel, FormControl, Switch, FormControlLabel, Stack, Button, Box, Alert, IconButton } from "@mui/material"
import SaveIcon from "@mui/icons-material/Save"
import DeleteIcon from "@mui/icons-material/Delete"
import AddIcon from "@mui/icons-material/Add"
import { subscriptionPlanInitialValues, subscriptionPlanValidationSchema } from "src/types/subscription-plan"
import { PolarProduct, PolarProductPrice, PolarProductInterval } from "src/types/polar-product-types"
import { createSubscriptionPlan, updateSubscriptionPlan } from "src/app/actions/subscription-plan/subscription-plan-actions"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"
import { notFound, useRouter } from "next/navigation"
import { SubscriptionFormHeader } from "./subscription-form-header"
import { isUUIDv4 } from "src/utils/uuid"
import { useState } from "react"

interface SubscriptionEditorProps {
     subscriptionPlansData?: PolarProduct
}

export default function SubscriptionEditor({ subscriptionPlansData }: SubscriptionEditorProps) {
     const { t } = useTranslation()
     const router = useRouter()

     if (subscriptionPlansData?.id && !isUUIDv4(subscriptionPlansData?.id)) {
          notFound()
     }

     const [prices, setPrices] = useState<PolarProductPrice[]>(
          subscriptionPlansData?.prices || []
     );

     const formik = useFormik({
          initialValues: {
               ...subscriptionPlanInitialValues,
               ...subscriptionPlansData,
          },
          validationSchema: subscriptionPlanValidationSchema(t),
          onSubmit: async (values: PolarProduct) => {
               const payload = {
                    ...values,
                    id: subscriptionPlansData?.id,
                    prices: prices
               } as PolarProduct;

               try {
                    let response;
                    if (values.id && values.id !== '') {
                         response = await updateSubscriptionPlan(payload);
                         if (response.updateSubscriptionPlanSuccess) {
                              toast.success("Product updated successfully!");
                              formik.resetForm({ values: { ...formik.values } });
                         } else {
                              toast.error("Failed to update product.");
                         }
                    } else {
                         response = await createSubscriptionPlan(payload);
                         if (response.createSubscriptionPlanSuccess) {
                              toast.success("Product created successfully!");
                              router.push(`/dashboard/subscriptions/${response.createdSubscriptionPlan?.id}`);
                         } else {
                              toast.error("Failed to create product.");
                         }
                    }
               } catch (error) {
                    toast.error("An error occurred while saving the product.");
               } finally {
                    formik.setSubmitting(false);
               }
          }
     });

     const handleAddPrice = () => {
          setPrices([...prices, {
               id: crypto.randomUUID(),
               createdAt: new Date(),
               modifiedAt: new Date(),
               source: 'manual',
               isArchived: false,
               productId: subscriptionPlansData?.id || '',
               type: 'recurring',
               recurringInterval: 'month',
               priceCurrency: 'USD',
               priceAmount: 0,
               legacy: false,
               amountType: 'fixed',
          }]);
     };

     const handleRemovePrice = (index: number) => {
          setPrices(prices.filter((_, i) => i !== index));
     };

     const handlePriceChange = (index: number, field: keyof PolarProductPrice, value: any) => {
          const updated = [...prices];
          updated[index] = { ...updated[index], [field]: value };
          setPrices(updated);
     };

     return (
          <form onSubmit={formik.handleSubmit}>
               <SubscriptionFormHeader subscriptionPlan={subscriptionPlansData} />
               <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                         <Stack spacing={3}>
                              <Card>
                                   <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                             {t("subscriptionPlans.basicInfo")}
                                        </Typography>
                                        <TextField
                                             fullWidth
                                             id="name"
                                             name="name"
                                             label={t("subscriptionPlans.productName")}
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
                                             label={t("subscriptionPlans.description")}
                                             value={formik.values.description}
                                             onChange={formik.handleChange}
                                             error={formik.touched.description && Boolean(formik.errors.description)}
                                             helperText={formik.touched.description && formik.errors.description}
                                             onBlur={formik.handleBlur}
                                             margin="normal"
                                             multiline
                                             rows={4}
                                        />
                                        <TextField
                                             fullWidth
                                             id="organization_id"
                                             name="organizationId"
                                             label={t("subscriptionPlans.organizationId")}
                                             value={formik.values.organizationId}
                                             onChange={formik.handleChange}
                                             error={formik.touched.organizationId && Boolean(formik.errors.organizationId)}
                                             helperText={formik.touched.organizationId && formik.errors.organizationId}
                                             margin="normal"
                                             onBlur={formik.handleBlur}
                                             placeholder="your-polar-organization-id"
                                        />
                                        <FormControlLabel
                                             control={
                                                  <Switch
                                                       id="isArchived"
                                                       name="isArchived"
                                                       checked={formik.values.isArchived}
                                                       onChange={formik.handleChange}
                                                  />
                                             }
                                             label={t("subscriptionPlans.archived")}
                                             sx={{ mt: 2 }}
                                        />
                                   </CardContent>
                              </Card>

                              <Card>
                                   <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                             {t("subscriptionPlans.recurringSettings")}
                                        </Typography>
                                        <FormControlLabel
                                             control={
                                                  <Switch
                                                       id="isRecurring"
                                                       name="isRecurring"
                                                       checked={formik.values.isRecurring}
                                                       onChange={formik.handleChange}
                                                  />
                                             }
                                             label={t("subscriptionPlans.recurring")}
                                        />
                                        {formik.values.isRecurring && (
                                             <>
                                                  <FormControl fullWidth margin="normal">
                                                       <InputLabel id="recurring-interval-label">
                                                            {t("subscriptionPlans.recurringInterval")}
                                                       </InputLabel>
                                                       <Select
                                                            labelId="recurring-interval-label"
                                                            id="recurringInterval"
                                                            name="recurringInterval"
                                                            value={formik.values.recurringInterval}
                                                            onChange={formik.handleChange}
                                                            label={t("subscriptionPlans.recurringInterval")}
                                                       >
                                                            <MenuItem value="day">{t("subscriptionPlans.interval.day")}</MenuItem>
                                                            <MenuItem value="week">{t("subscriptionPlans.interval.week")}</MenuItem>
                                                            <MenuItem value="month">{t("subscriptionPlans.interval.month")}</MenuItem>
                                                            <MenuItem value="year">{t("subscriptionPlans.interval.year")}</MenuItem>
                                                       </Select>
                                                  </FormControl>
                                                  <TextField
                                                       fullWidth
                                                       id="recurringIntervalCount"
                                                       name="recurringIntervalCount"
                                                       label={t("subscriptionPlans.recurringIntervalCount")}
                                                       type="number"
                                                       value={formik.values.recurringIntervalCount}
                                                       onChange={formik.handleChange}
                                                       error={formik.touched.recurringIntervalCount && Boolean(formik.errors.recurringIntervalCount)}
                                                       helperText={formik.touched.recurringIntervalCount && formik.errors.recurringIntervalCount}
                                                       margin="normal"
                                                       slotProps={{ htmlInput: { min: 1, step: "1" } }}
                                                       onBlur={formik.handleBlur}
                                                  />
                                             </>
                                        )}
                                   </CardContent>
                              </Card>

                              <Card>
                                   <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                             {t("subscriptionPlans.trialSettings")}
                                        </Typography>
                                        <FormControl fullWidth margin="normal">
                                             <InputLabel id="trial-interval-label">
                                                  {t("subscriptionPlans.trialInterval")}
                                             </InputLabel>
                                             <Select
                                                  labelId="trial-interval-label"
                                                  id="trialInterval"
                                                  name="trialInterval"
                                                  value={formik.values.trialInterval}
                                                  onChange={formik.handleChange}
                                                  label={t("subscriptionPlans.trialInterval")}
                                             >
                                                  <MenuItem value="day">{t("subscriptionPlans.interval.day")}</MenuItem>
                                                  <MenuItem value="week">{t("subscriptionPlans.interval.week")}</MenuItem>
                                                  <MenuItem value="month">{t("subscriptionPlans.interval.month")}</MenuItem>
                                                  <MenuItem value="year">{t("subscriptionPlans.interval.year")}</MenuItem>
                                             </Select>
                                        </FormControl>
                                        <TextField
                                             fullWidth
                                             id="trialIntervalCount"
                                             name="trialIntervalCount"
                                             label={t("subscriptionPlans.trialIntervalCount")}
                                             type="number"
                                             value={formik.values.trialIntervalCount}
                                             onChange={formik.handleChange}
                                             margin="normal"
                                             slotProps={{ htmlInput: { min: 0, step: "1" } }}
                                             onBlur={formik.handleBlur}
                                             helperText={t("subscriptionPlans.trialIntervalCountHelper")}
                                        />
                                   </CardContent>
                              </Card>
                         </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                         <Card>
                              <CardContent>
                                   <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="h6">
                                             {t("subscriptionPlans.prices")}
                                        </Typography>
                                        <Button
                                             variant="outlined"
                                             size="small"
                                             startIcon={<AddIcon />}
                                             onClick={handleAddPrice}
                                        >
                                             {t("subscriptionPlans.addPrice")}
                                        </Button>
                                   </Stack>

                                   {prices.length === 0 && (
                                        <Alert severity="info">
                                             {t("subscriptionPlans.noPricesYet")}
                                        </Alert>
                                   )}

                                   {prices.map((price, index) => (
                                        <Card key={index} sx={{ mb: 2, p: 2, bgcolor: 'background.default' }}>
                                             <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                                  <Typography variant="subtitle2">
                                                       {t("subscriptionPlans.price")} #{index + 1}
                                                  </Typography>
                                                  <IconButton
                                                       size="small"
                                                       color="error"
                                                       onClick={() => handleRemovePrice(index)}
                                                  >
                                                       <DeleteIcon />
                                                  </IconButton>
                                             </Stack>

                                             <TextField
                                                  fullWidth
                                                  label={t("subscriptionPlans.priceAmount")}
                                                  type="number"
                                                  value={price.priceAmount! / 100}
                                                  onChange={(e) => handlePriceChange(index, 'priceAmount', Math.round(parseFloat(e.target.value) * 100))}
                                                  slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                                                  margin="dense"
                                                  helperText={t("subscriptionPlans.priceAmountHelper")}
                                             />

                                             <FormControl fullWidth margin="dense">
                                                  <InputLabel>{t("subscriptionPlans.currency")}</InputLabel>
                                                  <Select
                                                       value={price.priceCurrency}
                                                       onChange={(e) => handlePriceChange(index, 'priceCurrency', e.target.value)}
                                                       label={t("subscriptionPlans.currency")}
                                                  >
                                                       <MenuItem value="USD">USD</MenuItem>
                                                       <MenuItem value="EUR">EUR</MenuItem>
                                                       <MenuItem value="GBP">GBP</MenuItem>
                                                       <MenuItem value="JPY">JPY</MenuItem>
                                                  </Select>
                                             </FormControl>

                                             <FormControl fullWidth margin="dense">
                                                  <InputLabel>{t("subscriptionPlans.priceType")}</InputLabel>
                                                  <Select
                                                       value={price.type}
                                                       onChange={(e) => handlePriceChange(index, 'type', e.target.value)}
                                                       label={t("subscriptionPlans.priceType")}
                                                  >
                                                       <MenuItem value="recurring">{t("subscriptionPlans.recurring")}</MenuItem>
                                                       <MenuItem value="one_time">{t("subscriptionPlans.oneTime")}</MenuItem>
                                                  </Select>
                                             </FormControl>

                                             {price.type === 'recurring' && (
                                                  <FormControl fullWidth margin="dense">
                                                       <InputLabel>{t("subscriptionPlans.recurringInterval")}</InputLabel>
                                                       <Select
                                                            value={price.recurringInterval}
                                                            onChange={(e) => handlePriceChange(index, 'recurringInterval', e.target.value)}
                                                            label={t("subscriptionPlans.recurringInterval")}
                                                       >
                                                            <MenuItem value="day">{t("subscriptionPlans.interval.day")}</MenuItem>
                                                            <MenuItem value="week">{t("subscriptionPlans.interval.week")}</MenuItem>
                                                            <MenuItem value="month">{t("subscriptionPlans.interval.month")}</MenuItem>
                                                            <MenuItem value="year">{t("subscriptionPlans.interval.year")}</MenuItem>
                                                       </Select>
                                                  </FormControl>
                                             )}
                                        </Card>
                                   ))}
                              </CardContent>
                         </Card>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                         <Button
                              loading={formik.isSubmitting}
                              type="submit"
                              variant="contained"
                              color="primary"
                              disabled={!formik.isValid || formik.isSubmitting || !formik.dirty}
                              startIcon={<SaveIcon />}
                         >
                              {t("common.btnSave")}
                         </Button>
                    </Grid>
               </Grid>
          </form>
     )
}

