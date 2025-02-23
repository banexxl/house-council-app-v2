'use client'

import type React from "react"
import { Formik, Form, Field } from "formik"
import * as Yup from "yup"
import { TextField, Button, FormControl, MenuItem } from "@mui/material"
import { Client } from "src/types/client"
import { useTranslation } from "react-i18next"
import { LoadingButton } from "@mui/lab"
import { ClientBillingInformation, clientBillingInformationInitialValues } from "src/types/client-billing-information"

interface CashPaymentFormProps {
     clients: Client[]
     onSubmit: (values: any) => void
     billingInformationData?: ClientBillingInformation
}

const CashPaymentForm: React.FC<CashPaymentFormProps> = ({ clients, onSubmit, billingInformationData }) => {

     const { t } = useTranslation()

     return (
          <Formik
               initialValues={{
                    ...clientBillingInformationInitialValues,
                    ...billingInformationData,
               }}
               validationSchema={Yup.object({
                    client_id: Yup.string().required(t('clients.clientIsRequired')),
                    cash_amount: Yup.number().required(t('clients.clientBillingInformationCashAmountIsRequired')).typeError(t('clients.clientBillingInformationCashAmountNumber')).positive(t('clients.clientBillingInformationCashAmountPositive'))
               })}
               onSubmit={onSubmit}
          >
               {({ errors, touched, values, setFieldValue, isValid, isSubmitting }) => (
                    <Form>
                         <FormControl fullWidth margin="normal" required>
                              <TextField
                                   select
                                   id="client-select"
                                   name="client_id"
                                   label={t('clients.client')}
                                   error={touched.client_id && !!errors.client_id}
                                   helperText={touched.client_id && errors.client_id}
                                   onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setFieldValue("client_id", e.target.value)
                                   }}
                                   value={clients.some(client => client.id === values.client_id) ? values.client_id : ""}
                              >
                                   {clients.map((client) => (
                                        <MenuItem key={client.id} value={client.id}>
                                             {client.name}
                                        </MenuItem>
                                   ))}
                              </TextField>
                         </FormControl>
                         <Field
                              as={TextField}
                              fullWidth
                              name="cash_amount"
                              label={t('clients.clientBillingInformationCashAmount')}
                              type="number"
                              inputProps={{ step: "0.01" }}
                              error={touched.cash_amount && errors.cash_amount}
                              helperText={touched.cash_amount && errors.cash_amount}
                              margin="normal"
                         />
                         <LoadingButton
                              type="submit"
                              variant="contained"
                              color="primary"
                              fullWidth
                              loading={isSubmitting}
                              disabled={isValid ? false : true}
                         >
                              {t('common.btnSave')}
                         </LoadingButton>
                    </Form>
               )}
          </Formik>
     )
}

export default CashPaymentForm

