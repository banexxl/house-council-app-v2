'use client'

import type React from "react"
import { useState } from "react"
import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent, Typography, Box, CardContent, Card } from "@mui/material"
import { Client } from "src/types/client"
import WireTransferForm from "./wire-transfer-form"
import CreditCardForm from "./credit-card-form"
import CashPaymentForm from "./cash-payment-form"
import BankTransferForm from "./bank-transfer-form"
import { ClientPaymentMethod } from "src/types/payment-method"


interface PaymentFormsContainerProps {
     allClients: Client[]
     clientPaymentMethods?: ClientPaymentMethod[]
}

const PaymentFormsContainer: React.FC<PaymentFormsContainerProps> = ({ allClients, clientPaymentMethods }) => {
     const [paymentType, setPaymentType] = useState("cash")

     const handlePaymentTypeChange = (event: SelectChangeEvent) => {
          console.log("Selected payment type:", event.target.value);

          setPaymentType(event.target.value as string)
     }

     const handleSubmit = (values: any) => {
          console.log("Form submitted:", values)
          // Here you would typically send the data to your backend
     }

     const renderForm = () => {
          switch (paymentType) {
               case "Cash":
                    return <CashPaymentForm clients={allClients} onSubmit={handleSubmit} />
               case "Wire Transfer":
                    return <WireTransferForm clients={allClients} onSubmit={handleSubmit} />
               case "Credit Card":
                    return <CreditCardForm clients={allClients} onSubmit={handleSubmit} />
               case "Bank Transfer":
                    return <BankTransferForm clients={allClients} onSubmit={handleSubmit} />
               default:
                    return null
          }
     }

     return (
          <Card>
               <CardContent>
                    <Typography variant="h4" gutterBottom>
                         Payment Form
                    </Typography>
               </CardContent>
               <CardContent>
                    <FormControl fullWidth margin="normal">
                         <InputLabel id="payment-type-label">Payment Type</InputLabel>
                         <Select
                              labelId="payment-type-label"
                              id="payment-type-select"
                              value={paymentType}
                              label="Payment Type"
                              onChange={handlePaymentTypeChange}
                         >
                              {
                                   clientPaymentMethods?.map((paymentMethod: ClientPaymentMethod) => (
                                        <MenuItem key={paymentMethod.id} value={paymentMethod.name}>
                                             {paymentMethod.name}
                                        </MenuItem>
                                   ))
                              }
                         </Select>
                    </FormControl>
                    {renderForm()}
               </CardContent>
          </Card>
     )
}

export default PaymentFormsContainer

