"use client"

import type React from "react"
import { useState } from "react"
import { Formik, Form, Field } from "formik"
import * as Yup from "yup"
import { TextField, InputAdornment, Button, FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { CreditCard } from "@mui/icons-material"
import { Mastercard, Visa, Amex } from "react-payment-logos/dist/flat"
import type { Client } from "src/types/client"

interface Card_numberFormProps {
     clients: Client[]
     onSubmit: (values: any) => void
}

export const CardNumberForm: React.FC<Card_numberFormProps> = ({ clients, onSubmit }) => {
     const [cardType, setCardType] = useState<string | null>(null)

     const detectCardType = (number: string) => {
          const visaPattern = /^4/
          const mastercardPattern = /^5[1-5]/
          const amexPattern = /^3[47]/

          if (visaPattern.test(number)) return "visa"
          if (mastercardPattern.test(number)) return "mastercard"
          if (amexPattern.test(number)) return "amex"
          return null
     }

     const getCardIcon = () => {
          switch (cardType) {
               case "visa":
                    return <Visa style={{ margin: 10, width: 50 }} />
               case "mastercard":
                    return <Mastercard style={{ margin: 10, width: 50 }} />
               case "amex":
                    return <Amex style={{ margin: 10, width: 50 }} />
               default:
                    return <CreditCard />
          }
     }

     const formatCard_number = (number: string) => {
          const digits = number.replace(/\D/g, "")
          const groups = []
          for (let i = 0; i < digits.length && i < 16; i += 4) {
               groups.push(digits.slice(i, i + 4))
          }
          return groups.join(" ")
     }


     return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
               <Formik
                    initialValues={{ client_id: "", full_name: "", billing_address: "", card_number: "", expiration_date: null, cvc: "" }}
                    validationSchema={Yup.object({
                         client_id: Yup.string().required("Client selection is required"),
                         full_name: Yup.string().required("Full name is required"),
                         billing_address: Yup.string().required("Billing address is required"),
                         card_number: Yup.string()
                              .required("Card number is required")
                              .test("len", "Must be exactly 16 digits", (val) => val?.replace(/\s+/g, "").length === 16),
                         expiration_date: Yup.date()
                              .required("Expiration date is required")
                              .min(new Date(), "Expiration date must be in the future"),
                         cvc: Yup.string()
                              .required("CVC is required")
                              .matches(/^\d{3}$/, "Must be exactly 3 digits"),
                    })}
                    onSubmit={onSubmit}
               >
                    {({ errors, touched, values, setFieldValue }) => (
                         <Form>
                              <FormControl fullWidth margin="normal" required>
                                   <TextField
                                        select
                                        id="client-select"
                                        name="client_id"
                                        label="Client"
                                        error={touched.client_id && !!errors.client_id}
                                        helperText={touched.client_id && errors.client_id}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                             setFieldValue("client_id", e.target.value)
                                        }}
                                        value={values.client_id}
                                   >
                                        {clients.map((client) => (
                                             <MenuItem key={client.id} value={client.id}>
                                                  {client.name}
                                             </MenuItem>
                                        ))}
                                   </TextField>
                              </FormControl>

                              <Field
                                   component={TextField}
                                   fullWidth
                                   margin="normal"
                                   name="full_name"
                                   label="Full Name"
                                   error={touched.full_name && !!errors.full_name}
                                   helperText={touched.full_name && errors.full_name}
                                   value={values.full_name}
                                   onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setFieldValue("full_name", e.target.value)
                                   }}
                                   sx={{ mb: 2 }}
                              />

                              <Field
                                   component={TextField}
                                   fullWidth
                                   margin="normal"
                                   name="billing_address"
                                   label="Billing Address"
                                   error={touched.billing_address && !!errors.billing_address}
                                   helperText={touched.billing_address && errors.billing_address}
                                   value={values.billing_address}
                                   onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setFieldValue("billing_address", e.target.value)
                                   }}
                                   sx={{ mb: 2 }}
                              />

                              <TextField
                                   fullWidth
                                   name="card_number"
                                   label="Card Number"
                                   error={touched.card_number && !!errors.card_number}
                                   helperText={touched.card_number && errors.card_number}
                                   onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const formattedValue = formatCard_number(e.target.value)
                                        setFieldValue("card_number", formattedValue)
                                        setCardType(detectCardType(formattedValue.replace(/\s+/g, "")))
                                   }}
                                   value={values.card_number}
                                   InputProps={{
                                        endAdornment: <InputAdornment position="end">{getCardIcon()}</InputAdornment>,
                                   }}
                                   sx={{ mb: 2, mt: 2 }}
                              />

                              <DatePicker
                                   label="Expiration Date"
                                   views={["year", "month"]}
                                   format="MM/yy"
                                   minDate={new Date()}
                                   value={values.expiration_date}
                                   onChange={(date) => setFieldValue("expiration_date", date)}
                                   slotProps={{
                                        textField: {
                                             fullWidth: true,
                                             error: touched.expiration_date && !!errors.expiration_date,
                                             helperText: touched.expiration_date && errors.expiration_date,
                                             sx: { mb: 2 },
                                        },
                                   }}
                              />

                              <TextField
                                   fullWidth
                                   name="cvc"
                                   label="CVC"
                                   error={touched.cvc && !!errors.cvc}
                                   helperText={touched.cvc && errors.cvc}
                                   onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const value = e.target.value.replace(/\D/g, "").slice(0, 3)
                                        setFieldValue("cvc", value)
                                   }}
                                   value={values.cvc}
                                   sx={{ mb: 2 }}
                              />

                              <Button type="submit" variant="contained" color="primary" fullWidth>
                                   Submit Credit Card Payment
                              </Button>
                         </Form>
                    )}
               </Formik>
          </LocalizationProvider>
     )
}

