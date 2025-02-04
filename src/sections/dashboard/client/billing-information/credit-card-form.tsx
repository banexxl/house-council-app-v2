"use client"

import type React from "react"
import { useState } from "react"
import { Formik, Form, Field } from "formik"
import * as Yup from "yup"
import { TextField, InputAdornment, Button, FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { CreditCard } from "@mui/icons-material"
import { Mastercard, Visa, Amex } from "react-payment-logos/dist/flat"
import type { Client } from "src/types/client"

interface CardNumberFieldProps {
     clients: Client[]
     onSubmit: (values: any) => void
}

const CardNumberField: React.FC<CardNumberFieldProps> = ({ clients, onSubmit }) => {
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

     const formatCardNumber = (number: string) => {
          const digits = number.replace(/\D/g, "")
          const groups = []
          for (let i = 0; i < digits.length && i < 16; i += 4) {
               groups.push(digits.slice(i, i + 4))
          }
          return groups.join(" ")
     }

     const formatAmount = (value: string) => {
          const number = Number.parseFloat(value)
          if (isNaN(number)) return ""
          return number.toFixed(2)
     }

     return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
               <Formik
                    initialValues={{ clientId: "", cardNumber: "", expirationDate: null, cvv: "", amount: "" }}
                    validationSchema={Yup.object({
                         clientId: Yup.string().required("Client selection is required"),
                         cardNumber: Yup.string()
                              .required("Card number is required")
                              .test("len", "Must be exactly 16 digits", (val) => val?.replace(/\s+/g, "").length === 16),
                         expirationDate: Yup.date()
                              .required("Expiration date is required")
                              .min(new Date(), "Expiration date must be in the future"),
                         cvv: Yup.string()
                              .required("CVV is required")
                              .matches(/^\d{3}$/, "Must be exactly 3 digits"),
                         amount: Yup.number().required("Amount is required").positive("Amount must be positive"),
                    })}
                    onSubmit={onSubmit}
               >
                    {({ errors, touched, values, setFieldValue }) => (
                         <Form>
                              <FormControl fullWidth margin="normal">
                                   <InputLabel id="client-select-label">Client</InputLabel>
                                   <Field as={Select} labelId="client-select-label" id="client-select" name="clientId" label="Client">
                                        {clients.map((client) => (
                                             <MenuItem key={client.id} value={client.id}>
                                                  {client.name}
                                             </MenuItem>
                                        ))}
                                   </Field>
                              </FormControl>

                              <TextField
                                   fullWidth
                                   name="cardNumber"
                                   label="Card Number"
                                   error={touched.cardNumber && !!errors.cardNumber}
                                   helperText={touched.cardNumber && errors.cardNumber}
                                   onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const formattedValue = formatCardNumber(e.target.value)
                                        setFieldValue("cardNumber", formattedValue)
                                        setCardType(detectCardType(formattedValue.replace(/\s+/g, "")))
                                   }}
                                   value={values.cardNumber}
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
                                   value={values.expirationDate}
                                   onChange={(date) => setFieldValue("expirationDate", date)}
                                   slotProps={{
                                        textField: {
                                             fullWidth: true,
                                             error: touched.expirationDate && !!errors.expirationDate,
                                             helperText: touched.expirationDate && errors.expirationDate,
                                             sx: { mb: 2 },
                                        },
                                   }}
                              />

                              <TextField
                                   fullWidth
                                   name="cvv"
                                   label="CVV"
                                   error={touched.cvv && !!errors.cvv}
                                   helperText={touched.cvv && errors.cvv}
                                   onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const value = e.target.value.replace(/\D/g, "").slice(0, 3)
                                        setFieldValue("cvv", value)
                                   }}
                                   value={values.cvv}
                                   sx={{ mb: 2 }}
                              />

                              <TextField
                                   fullWidth
                                   name="amount"
                                   label="Amount"
                                   type="text"
                                   error={touched.amount && !!errors.amount}
                                   helperText={touched.amount && errors.amount}
                                   onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const rawValue = e.target.value.replace(/[^0-9.]/g, ""); // Allow only numbers & decimals
                                        setFieldValue("amount", rawValue);
                                   }}
                                   onBlur={() => {
                                        setFieldValue("amount", formatAmount(values.amount)); // Format when losing focus
                                   }}
                                   value={values.amount}
                                   InputProps={{
                                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                   }}
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

export default CardNumberField

