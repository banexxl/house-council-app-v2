'use client'

import type React from "react"
import { Formik, Form, Field } from "formik"
import * as Yup from "yup"
import { TextField, Button } from "@mui/material"
import { Client } from "src/types/client"
import ClientSelect from "./client-select"

interface CashPaymentFormProps {
     clients: Client[]
     onSubmit: (values: any) => void
}

const CashPaymentForm: React.FC<CashPaymentFormProps> = ({ clients, onSubmit }) => {
     return (
          <Formik
               initialValues={{ clientId: "", amount: "" }}
               validationSchema={Yup.object({
                    clientId: Yup.string().required("Client selection is required"),
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
                              name="amount"
                              label="Cash Amount"
                              type="number"
                              error={touched.amount && errors.amount}
                              helperText={touched.amount && errors.amount}
                              margin="normal"
                         />
                         <Button type="submit" variant="contained" color="primary" fullWidth>
                              Submit Cash Payment
                         </Button>
                    </Form>
               )}
          </Formik>
     )
}

export default CashPaymentForm

