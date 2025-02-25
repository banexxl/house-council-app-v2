"use client"

import { useFormik } from "formik"
import * as Yup from "yup"
import { Card, CardContent, TextField, Button, Typography, Grid, Select, MenuItem, InputLabel, FormControl, Switch, FormControlLabel } from "@mui/material"
import { BaseEntity } from "src/app/actions/base-entity-actions"
import { SubscriptionPlan, subscriptionPlanInitialValues, subscriptionPlanValidationSchema } from "src/types/subscription-plan"
import { createSubscriptionPlan } from "src/app/actions/subscription-plans/subscription-plan-actions"
import { LoadingButton } from "@mui/lab"
import toast from "react-hot-toast"

interface SubscriptionEditorProps {
     subscriptionStatuses: BaseEntity[]
     features: BaseEntity[]
     subscriptionPlanData?: SubscriptionPlan
}

export default function SubscriptionEditor({ subscriptionStatuses, features, subscriptionPlanData }: SubscriptionEditorProps) {

     const formik = useFormik({
          initialValues: {
               ...subscriptionPlanInitialValues,
               ...subscriptionPlanData
          },
          validationSchema: subscriptionPlanValidationSchema,
          onSubmit: async (values: SubscriptionPlan) => {
               try {
                    const createOrEditSubscriptionPlanResponse = subscriptionPlanData
                         ? await createSubscriptionPlan({ ...values, id: subscriptionPlanData.id })
                         : await createSubscriptionPlan(values);

                    if (createOrEditSubscriptionPlanResponse.createSubscriptionPlanSuccess) {
                         toast.success('Subscription plan saved successfully!');
                         formik.setSubmitting(false);
                    } else {
                         toast.error('Failed to save subscription plan.');
                         formik.setSubmitting(false);
                    }
               } catch (error) {
                    toast.error('An unexpected error occurred.');
                    formik.setSubmitting(false);
               }
          },
     })

     const calculatePrice = () => {
          let totalPrice = 0

          if (formik.values.is_discounted) {
               totalPrice *= 1 - formik.values.discount_percentage / 100
          }

          if (formik.values.can_bill_yearly) {
               totalPrice *= 12 // Calculate yearly price
               totalPrice *= 1 - formik.values.yearly_discount_percentage / 100 // Apply yearly discount
          }

          return totalPrice
     }

     return (
          <form onSubmit={formik.handleSubmit}>
               <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                         <Card>
                              <CardContent>
                                   <Typography variant="h6" gutterBottom>
                                        Subscription Details
                                   </Typography>
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
                                                  onChange={formik.handleChange}
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
                                             onChange={formik.handleChange}
                                             error={formik.touched.yearly_discount_percentage && Boolean(formik.errors.yearly_discount_percentage)}
                                             helperText={formik.touched.yearly_discount_percentage && formik.errors.yearly_discount_percentage}
                                             margin="normal"
                                             InputProps={{ inputProps: { min: 0, max: 100 } }}
                                        />
                                   )}
                                   <FormControlLabel
                                        control={
                                             <Switch
                                                  id="is_discounted"
                                                  name="is_discounted"
                                                  checked={formik.values.is_discounted}
                                                  onChange={formik.handleChange}
                                             />
                                        }
                                        label="Apply Additional Discount"
                                   />
                                   {formik.values.is_discounted && (
                                        <TextField
                                             fullWidth
                                             id="discount_percentage"
                                             name="discount_percentage"
                                             label="discount_percentage"
                                             type="number"
                                             value={formik.values.discount_percentage}
                                             onChange={formik.handleChange}
                                             error={formik.touched.discount_percentage && Boolean(formik.errors.discount_percentage)}
                                             helperText={formik.touched.discount_percentage && formik.errors.discount_percentage}
                                             margin="normal"
                                             InputProps={{ inputProps: { min: 0, max: 100 } }}
                                        />
                                   )}
                                   <Typography variant="h5" className="mt-4">
                                        Total Price: ${calculatePrice().toFixed(2)}
                                        {formik.values.can_bill_yearly ? " per year" : " per month"}
                                   </Typography>
                              </CardContent>
                         </Card>
                    </Grid>
                    {
                         subscriptionPlanData && subscriptionPlanData.id !== '' && (
                              <Grid item xs={12} md={6}>
                                   <Card>
                                        <CardContent>
                                             <Typography variant="h6" gutterBottom>
                                                  Features
                                             </Typography>
                                             {features.map((feature: BaseEntity) => (
                                                  <FormControlLabel
                                                       key={feature.id}
                                                       control={
                                                            <Switch
                                                                 id={`feature-${feature.id}`}
                                                                 name={'feature-id'}
                                                                 checked={formik.values.features!.includes(feature.id!)}
                                                                 onChange={formik.handleChange}
                                                            />
                                                       }
                                                       label={feature.name}
                                                  />
                                             ))}
                                        </CardContent>
                                   </Card>
                              </Grid>
                         )
                    }
                    <Grid item xs={12}>
                         <LoadingButton
                              loading={formik.isSubmitting}
                              type='submit'
                              variant="contained"
                              color="primary"
                         >
                              Save Subscription
                         </LoadingButton>
                    </Grid>
               </Grid>
          </form>
     )
}

