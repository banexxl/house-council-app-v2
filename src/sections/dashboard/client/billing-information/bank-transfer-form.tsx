'use client'

import type React from "react"
import { Formik, Form, Field } from "formik"
import * as Yup from "yup"
import { TextField, Button } from "@mui/material"
import { Client } from "src/types/client"
import ClientSelect from "./client-select"

interface BankTransferFormProps {
     clients: Client[]
     onSubmit: (values: any) => void
}

const BankTransferForm: React.FC<BankTransferFormProps> = ({ clients, onSubmit }) => {
     return (
          <Formik
               initialValues={{ clientId: "", accountNumber: "", routingNumber: "", amount: "" }}
               validationSchema={Yup.object({
                    clientId: Yup.string().required("Client selection is required"),
                    accountNumber: Yup.string().required("Account number is required"),
                    routingNumber: Yup.string().required("Routing number is required"),
                    amount: Yup.number().required("Amount is required").positive("Amount must be positive"),
               })}
               onSubmit={onSubmit}
          >
               {({ errors, touched }) => (
                    <Form>
                         <ClientSelect clients={clients} />
                         <Field
                              as={TextField}
                              fullWidth
                              name="accountNumber"
                              label="Account Number"
                              error={touched.accountNumber && errors.accountNumber}
                              helperText={touched.accountNumber && errors.accountNumber}
                              margin="normal"
                         />
                         <Field
                              as={TextField}
                              fullWidth
                              name="routingNumber"
                              label="Routing Number"
                              error={touched.routingNumber && errors.routingNumber}
                              helperText={touched.routingNumber && errors.routingNumber}
                              margin="normal"
                         />
                         <Field
                              as={TextField}
                              fullWidth
                              name="amount"
                              label="Amount"
                              type="number"
                              error={touched.amount && errors.amount}
                              helperText={touched.amount && errors.amount}
                              margin="normal"
                         />
                         <Button type="submit" variant="contained" color="primary" fullWidth>
                              Submit Bank Transfer
                         </Button>
                    </Form>
               )}
          </Formik>
     )
}

export default BankTransferForm

