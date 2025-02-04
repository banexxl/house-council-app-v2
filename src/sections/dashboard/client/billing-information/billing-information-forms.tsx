'use client'

import type React from "react"
import { useState, useEffect } from "react"
import { Formik, Form, Field } from "formik"
import * as Yup from "yup"
import {
     Box,
     Button,
     Card,
     CardContent,
     FormControl,
     InputLabel,
     MenuItem,
     Select,
     TextField,
     Typography,
     type SelectChangeEvent,
} from "@mui/material"

const paymentTypes = [
     { name: "Cash", description: "Payment made in physical cash." },
     { name: "Wire Transfer", description: "Payment through a wire transfer system such as SWIFT." },
     { name: "Debit Card", description: "Payment using a debit card linked directly to a bank account." },
     { name: "Bank Transfer", description: "Direct payment through bank account transfers." },
     { name: "Invoice Billing", description: "Payment made after receiving an invoice." },
     { name: "PayPal", description: "Online payment through a PayPal account." },
     { name: "Check", description: "Payment made via a written check." },
     { name: "Cryptocurrency", description: "Payment using digital currencies such as Bitcoin or Ethereum." },
     { name: "Credit Card", description: "Payment using a credit card such as Visa, MasterCard, or American Express." },
]

const PaymentForm: React.FC = () => {
     const [selectedPaymentType, setSelectedPaymentType] = useState(paymentTypes[0].name)
     const [key, setKey] = useState(0)

     const handlePaymentTypeChange = (event: SelectChangeEvent<string>) => {
          setSelectedPaymentType(event.target.value)
     }

     useEffect(() => {
          setKey((prevKey) => prevKey + 1)
     }, [selectedPaymentType]) //This hook specifies more dependencies than necessary: selectedPaymentType

     const renderForm = () => {
          switch (selectedPaymentType) {
               case "Cash":
                    return <CashForm key={key} />
               case "Wire Transfer":
                    return <WireTransferForm key={key} />
               case "Debit Card":
               case "Credit Card":
                    return <CardForm key={key} />
               case "Bank Transfer":
                    return <BankTransferForm key={key} />
               case "Invoice Billing":
                    return <InvoiceBillingForm key={key} />
               case "PayPal":
                    return <PayPalForm key={key} />
               case "Check":
                    return <CheckForm key={key} />
               case "Cryptocurrency":
                    return <CryptocurrencyForm key={key} />
               default:
                    return null
          }
     }

     return (
          <Card>
               <CardContent>
                    <Typography variant="h5" gutterBottom>
                         Payment Information
                    </Typography>
                    <FormControl fullWidth margin="normal">
                         <InputLabel id="payment-type-label">Payment Type</InputLabel>
                         <Select
                              labelId="payment-type-label"
                              id="payment-type-select"
                              value={selectedPaymentType}
                              onChange={handlePaymentTypeChange}
                              label="Payment Type"
                         >
                              {paymentTypes.map((type) => (
                                   <MenuItem key={type.name} value={type.name}>
                                        {type.name}
                                   </MenuItem>
                              ))}
                         </Select>
                    </FormControl>
                    <Box mt={2}>{renderForm()}</Box>
               </CardContent>
          </Card>
     )
}

const CashForm: React.FC = () => {
     return (
          <Formik
               initialValues={{ amount: "" }}
               validationSchema={Yup.object({
                    amount: Yup.number().required("Required").positive("Must be positive"),
               })}
               onSubmit={(values, { setSubmitting }) => {
                    setTimeout(() => {
                         alert(JSON.stringify(values, null, 2))
                         setSubmitting(false)
                    }, 400)
               }}
          >
               {({ errors, touched }) => (
                    <Form>
                         <Field
                              as={TextField}
                              fullWidth
                              name="amount"
                              label="Cash Amount"
                              type="number"
                              error={touched.amount && errors.amount}
                              helperText={touched.amount && errors.amount}
                         />
                         <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
                              Submit Cash Payment
                         </Button>
                    </Form>
               )}
          </Formik>
     )
}

const WireTransferForm: React.FC = () => {
     return (
          <Formik
               initialValues={{ accountNumber: "", routingNumber: "", amount: "" }}
               validationSchema={Yup.object({
                    accountNumber: Yup.string().required("Required"),
                    routingNumber: Yup.string().required("Required"),
                    amount: Yup.number().required("Required").positive("Must be positive"),
               })}
               onSubmit={(values, { setSubmitting }) => {
                    setTimeout(() => {
                         alert(JSON.stringify(values, null, 2))
                         setSubmitting(false)
                    }, 400)
               }}
          >
               {({ errors, touched }) => (
                    <Form>
                         <Field
                              as={TextField}
                              fullWidth
                              name="accountNumber"
                              label="Account Number"
                              error={touched.accountNumber && errors.accountNumber}
                              helperText={touched.accountNumber && errors.accountNumber}
                              sx={{ mb: 2 }}
                         />
                         <Field
                              as={TextField}
                              fullWidth
                              name="routingNumber"
                              label="Routing Number"
                              error={touched.routingNumber && errors.routingNumber}
                              helperText={touched.routingNumber && errors.routingNumber}
                              sx={{ mb: 2 }}
                         />
                         <Field
                              as={TextField}
                              fullWidth
                              name="amount"
                              label="Amount"
                              type="number"
                              error={touched.amount && errors.amount}
                              helperText={touched.amount && errors.amount}
                              sx={{ mb: 2 }}
                         />
                         <Button type="submit" variant="contained" color="primary" fullWidth>
                              Submit Wire Transfer
                         </Button>
                    </Form>
               )}
          </Formik>
     )
}

const CardForm: React.FC = () => {
     return (
          <Formik
               initialValues={{ cardNumber: "", expirationDate: "", cvv: "", name: "" }}
               validationSchema={Yup.object({
                    cardNumber: Yup.string()
                         .required("Required")
                         .matches(/^\d{16}$/, "Must be 16 digits"),
                    expirationDate: Yup.string()
                         .required("Required")
                         .matches(/^(0[1-9]|1[0-2])\/\d{2}$/, "MM/YY format required"),
                    cvv: Yup.string()
                         .required("Required")
                         .matches(/^\d{3,4}$/, "Must be 3 or 4 digits"),
                    name: Yup.string().required("Required"),
               })}
               onSubmit={(values, { setSubmitting }) => {
                    setTimeout(() => {
                         alert(JSON.stringify(values, null, 2))
                         setSubmitting(false)
                    }, 400)
               }}
          >
               {({ errors, touched }) => (
                    <Form>
                         <Field
                              as={TextField}
                              fullWidth
                              name="cardNumber"
                              label="Card Number"
                              error={touched.cardNumber && errors.cardNumber}
                              helperText={touched.cardNumber && errors.cardNumber}
                              sx={{ mb: 2 }}
                         />
                         <Field
                              as={TextField}
                              fullWidth
                              name="expirationDate"
                              label="Expiration Date (MM/YY)"
                              error={touched.expirationDate && errors.expirationDate}
                              helperText={touched.expirationDate && errors.expirationDate}
                              sx={{ mb: 2 }}
                         />
                         <Field
                              as={TextField}
                              fullWidth
                              name="cvv"
                              label="CVV"
                              error={touched.cvv && errors.cvv}
                              helperText={touched.cvv && errors.cvv}
                              sx={{ mb: 2 }}
                         />
                         <Field
                              as={TextField}
                              fullWidth
                              name="name"
                              label="Name on Card"
                              error={touched.name && errors.name}
                              helperText={touched.name && errors.name}
                              sx={{ mb: 2 }}
                         />
                         <Button type="submit" variant="contained" color="primary" fullWidth>
                              Submit Card Payment
                         </Button>
                    </Form>
               )}
          </Formik>
     )
}

const BankTransferForm: React.FC = () => {
     return (
          <Formik
               initialValues={{ accountNumber: "", routingNumber: "", amount: "" }}
               validationSchema={Yup.object({
                    accountNumber: Yup.string().required("Required"),
                    routingNumber: Yup.string().required("Required"),
                    amount: Yup.number().required("Required").positive("Must be positive"),
               })}
               onSubmit={(values, { setSubmitting }) => {
                    setTimeout(() => {
                         alert(JSON.stringify(values, null, 2))
                         setSubmitting(false)
                    }, 400)
               }}
          >
               {({ errors, touched }) => (
                    <Form>
                         <Field
                              as={TextField}
                              fullWidth
                              name="accountNumber"
                              label="Account Number"
                              error={touched.accountNumber && errors.accountNumber}
                              helperText={touched.accountNumber && errors.accountNumber}
                              sx={{ mb: 2 }}
                         />
                         <Field
                              as={TextField}
                              fullWidth
                              name="routingNumber"
                              label="Routing Number"
                              error={touched.routingNumber && errors.routingNumber}
                              helperText={touched.routingNumber && errors.routingNumber}
                              sx={{ mb: 2 }}
                         />
                         <Field
                              as={TextField}
                              fullWidth
                              name="amount"
                              label="Amount"
                              type="number"
                              error={touched.amount && errors.amount}
                              helperText={touched.amount && errors.amount}
                              sx={{ mb: 2 }}
                         />
                         <Button type="submit" variant="contained" color="primary" fullWidth>
                              Submit Bank Transfer
                         </Button>
                    </Form>
               )}
          </Formik>
     )
}

const InvoiceBillingForm: React.FC = () => {
     return (
          <Formik
               initialValues={{ invoiceNumber: "", amount: "", dueDate: "" }}
               validationSchema={Yup.object({
                    invoiceNumber: Yup.string().required("Required"),
                    amount: Yup.number().required("Required").positive("Must be positive"),
                    dueDate: Yup.date().required("Required"),
               })}
               onSubmit={(values, { setSubmitting }) => {
                    setTimeout(() => {
                         alert(JSON.stringify(values, null, 2))
                         setSubmitting(false)
                    }, 400)
               }}
          >
               {({ errors, touched }) => (
                    <Form>
                         <Field
                              as={TextField}
                              fullWidth
                              name="invoiceNumber"
                              label="Invoice Number"
                              error={touched.invoiceNumber && errors.invoiceNumber}
                              helperText={touched.invoiceNumber && errors.invoiceNumber}
                              sx={{ mb: 2 }}
                         />
                         <Field
                              as={TextField}
                              fullWidth
                              name="amount"
                              label="Amount"
                              type="number"
                              error={touched.amount && errors.amount}
                              helperText={touched.amount && errors.amount}
                              sx={{ mb: 2 }}
                         />
                         <Field
                              as={TextField}
                              fullWidth
                              name="dueDate"
                              label="Due Date"
                              type="date"
                              InputLabelProps={{ shrink: true }}
                              error={touched.dueDate && errors.dueDate}
                              helperText={touched.dueDate && errors.dueDate}
                              sx={{ mb: 2 }}
                         />
                         <Button type="submit" variant="contained" color="primary" fullWidth>
                              Submit Invoice Billing
                         </Button>
                    </Form>
               )}
          </Formik>
     )
}

const PayPalForm: React.FC = () => {
     return (
          <Formik
               initialValues={{ email: "", amount: "" }}
               validationSchema={Yup.object({
                    email: Yup.string().email("Invalid email address").required("Required"),
                    amount: Yup.number().required("Required").positive("Must be positive"),
               })}
               onSubmit={(values, { setSubmitting }) => {
                    setTimeout(() => {
                         alert(JSON.stringify(values, null, 2))
                         setSubmitting(false)
                    }, 400)
               }}
          >
               {({ errors, touched }) => (
                    <Form>
                         <Field
                              as={TextField}
                              fullWidth
                              name="email"
                              label="PayPal Email"
                              error={touched.email && errors.email}
                              helperText={touched.email && errors.email}
                              sx={{ mb: 2 }}
                         />
                         <Field
                              as={TextField}
                              fullWidth
                              name="amount"
                              label="Amount"
                              type="number"
                              error={touched.amount && errors.amount}
                              helperText={touched.amount && errors.amount}
                              sx={{ mb: 2 }}
                         />
                         <Button type="submit" variant="contained" color="primary" fullWidth>
                              Submit PayPal Payment
                         </Button>
                    </Form>
               )}
          </Formik>
     )
}

const CheckForm: React.FC = () => {
     return (
          <Formik
               initialValues={{ checkNumber: "", amount: "", date: "" }}
               validationSchema={Yup.object({
                    checkNumber: Yup.string().required("Required"),
                    amount: Yup.number().required("Required").positive("Must be positive"),
                    date: Yup.date().required("Required"),
               })}
               onSubmit={(values, { setSubmitting }) => {
                    setTimeout(() => {
                         alert(JSON.stringify(values, null, 2))
                         setSubmitting(false)
                    }, 400)
               }}
          >
               {({ errors, touched }) => (
                    <Form>
                         <Field
                              as={TextField}
                              fullWidth
                              name="checkNumber"
                              label="Check Number"
                              error={touched.checkNumber && errors.checkNumber}
                              helperText={touched.checkNumber && errors.checkNumber}
                              sx={{ mb: 2 }}
                         />
                         <Field
                              as={TextField}
                              fullWidth
                              name="amount"
                              label="Amount"
                              type="number"
                              error={touched.amount && errors.amount}
                              helperText={touched.amount && errors.amount}
                              sx={{ mb: 2 }}
                         />
                         <Field
                              as={TextField}
                              fullWidth
                              name="date"
                              label="Check Date"
                              type="date"
                              InputLabelProps={{ shrink: true }}
                              error={touched.date && errors.date}
                              helperText={touched.date && errors.date}
                              sx={{ mb: 2 }}
                         />
                         <Button type="submit" variant="contained" color="primary" fullWidth>
                              Submit Check Payment
                         </Button>
                    </Form>
               )}
          </Formik>
     )
}

const CryptocurrencyForm: React.FC = () => {
     return (
          <Formik
               initialValues={{ walletAddress: "", amount: "", currency: "" }}
               validationSchema={Yup.object({
                    walletAddress: Yup.string().required("Required"),
                    amount: Yup.number().required("Required").positive("Must be positive"),
                    currency: Yup.string().required("Required"),
               })}
               onSubmit={(values, { setSubmitting }) => {
                    setTimeout(() => {
                         alert(JSON.stringify(values, null, 2))
                         setSubmitting(false)
                    }, 400)
               }}
          >
               {({ errors, touched }) => (
                    <Form>
                         <Field
                              as={TextField}
                              fullWidth
                              name="walletAddress"
                              label="Wallet Address"
                              error={touched.walletAddress && errors.walletAddress}
                              helperText={touched.walletAddress && errors.walletAddress}
                              sx={{ mb: 2 }}
                         />
                         <Field
                              as={TextField}
                              fullWidth
                              name="amount"
                              label="Amount"
                              type="number"
                              error={touched.amount && errors.amount}
                              helperText={touched.amount && errors.amount}
                              sx={{ mb: 2 }}
                         />
                         <Field
                              as={TextField}
                              fullWidth
                              name="currency"
                              label="Cryptocurrency"
                              error={touched.currency && errors.currency}
                              helperText={touched.currency && errors.currency}
                              sx={{ mb: 2 }}
                         />
                         <Button type="submit" variant="contained" color="primary" fullWidth>
                              Submit Cryptocurrency Payment
                         </Button>
                    </Form>
               )}
          </Formik>
     )
}

export default PaymentForm

