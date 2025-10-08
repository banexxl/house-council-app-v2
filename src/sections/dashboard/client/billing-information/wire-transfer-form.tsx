'use client'

import type React from "react"
import { Formik, Form, Field } from "formik"
import * as Yup from "yup"
import { TextField, Button } from "@mui/material"
import { Client } from "src/types/client"
import ClientSelect from "./client-select"

interface WireTransferFormProps {
     clients: Client[]
     onSubmit: (values: any) => void
}

const WireTransferForm: React.FC<WireTransferFormProps> = ({ clients, onSubmit }) => {
     return (
          <Formik
               initialValues={{ clientId: "", amount: "", bankName: "", accountNumber: "", routingNumber: "" }}
               validationSchema={Yup.object({
                    clientId: Yup.string().required("Client selection is required"),
                    amount: Yup.number().required("Amount is required").positive("Amount must be positive"),
                    bankName: Yup.string().required("Bank name is required"),
                    accountNumber: Yup.string().required("Account number is required"),
                    routingNumber: Yup.string().required("Routing number is required"),
               })}
               onSubmit={onSubmit}
          >
               {({ errors, touched, isSubmitting, isValid }) => (
                    <Form>
                         <ClientSelect clients={clients} />
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
                         <Field
                              as={TextField}
                              fullWidth
                              name="bankName"
                              label="Bank Name"
                              error={touched.bankName && errors.bankName}
                              helperText={touched.bankName && errors.bankName}
                              margin="normal"
                         />
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
                         <Button
                              type="submit"
                              variant="contained"
                              color="primary"
                              fullWidth
                              loading={isSubmitting}
                              disabled={!isValid}
                         >
                              Submit Wire Transfer
                         </Button>
                    </Form>
               )}
          </Formik>
     )
}

export default WireTransferForm

