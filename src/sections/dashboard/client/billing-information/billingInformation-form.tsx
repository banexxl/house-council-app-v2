'use client'

import type React from "react"
import { useState } from "react"
import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent, Typography, Box, CardContent, Card } from "@mui/material"
import { Client } from "src/types/client"
import WireTransferForm from "./wire-transfer-form"
import { CardNumberForm } from "./credit-card-form"
import CashPaymentForm from "./cash-payment-form"
import BankTransferForm from "./bank-transfer-form"
import { useTranslation } from "react-i18next"
import { createClientBillingInformation } from "src/app/actions/client-actions/client-billing-actions"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"
import { paths } from "src/paths"
import { BaseEntity } from "src/app/actions/base-entity-services"

interface ClientBillingInformationFormProps {
     allClients: Client[]
     clientPaymentMethods?: BaseEntity[]
     billingInformationStatuses?: BaseEntity[]
}

export const ClientBillingInformationForm: React.FC<ClientBillingInformationFormProps> = ({ allClients, clientPaymentMethods, billingInformationStatuses }) => {
     const [paymentType, setPaymentType] = useState<{ value: string; name: string }>({ value: "", name: "" })
     const [isSubmitting, setIsSubmitting] = useState(false)
     const router = useRouter()
     const [billingInformationStatus, setBillingInformationStatus] = useState<{ value: string; name: string }>({
          value: billingInformationStatuses?.[0]?.id || "",
          name: billingInformationStatuses?.[0]?.name || "",
     });
     const { t } = useTranslation()
     const handlePaymentTypeChange = (event: SelectChangeEvent) => {
          const paymentMethod = clientPaymentMethods?.find((p) => p.id === event.target.value)
          setPaymentType({ value: event.target.value, name: paymentMethod?.name || "" })
     }

     const handleBillingInformationStatusChange = (event: SelectChangeEvent) => {
          const status = billingInformationStatuses?.find((p) => p.id === event.target.value)
          setBillingInformationStatus({ value: event.target.value, name: status?.name || "" })
     }

     const handleSubmit = async (values: any, paymentTypeId: string, billingInformationStatusId: string) => {
          setIsSubmitting(true)
          try {
               const response = await createClientBillingInformation(values, paymentTypeId, billingInformationStatusId);
               if (response.createClientBillingInformationSuccess) {
                    toast.success(t('clients.clientPaymentMethodAdded'));
                    console.log('respnse', response);

                    router.push(paths.dashboard.clients.billingInformation.details + '/' + response.createClientBillingInformation?.id)
               } else {
                    toast.error(t('clients.clientPaymentMethodError'));
               }
          } catch (error) {
               toast.error(t('clients.clientPaymentMethodError'));
          } finally {
               setIsSubmitting(false)
          }
     }

     const renderForm = () => {
          switch (paymentType.name) {
               case "Cash":
                    return <CashPaymentForm clients={allClients} onSubmit={(values) => handleSubmit(values, paymentType.value, billingInformationStatus.value)} />
               case "Wire Transfer":
                    return <WireTransferForm clients={allClients} onSubmit={(values) => handleSubmit(values, paymentType.value, billingInformationStatus.value)} />
               case "Credit Card":
                    return <CardNumberForm clients={allClients} onSubmit={(values: any) => handleSubmit(values, paymentType.value, billingInformationStatus.value)} isSubmitting={isSubmitting} />
               case "Bank Transfer":
                    return <BankTransferForm clients={allClients} onSubmit={(values) => handleSubmit(values, paymentType.value, billingInformationStatus.value)} />
               default:
                    return null
          }
     }

     return (
          <Card>
               <CardContent>
                    <Typography variant="h4" gutterBottom>
                         {t('clients.clientAddPaymentMethod')}
                    </Typography>
               </CardContent>
               <CardContent>
                    <FormControl fullWidth margin="normal" required error={!billingInformationStatus.value && billingInformationStatuses!.length > 0}>
                         <InputLabel id="status-label">Status</InputLabel>
                         <Select
                              value={billingInformationStatus.value || billingInformationStatuses?.[0]?.id}
                              name="Status"
                              label="Status"
                              onChange={handleBillingInformationStatusChange}
                              required
                         >
                              {
                                   billingInformationStatuses?.map((status: BaseEntity) => (
                                        <MenuItem key={status.id} value={status.id}>
                                             {status.name}
                                        </MenuItem>
                                   ))
                              }
                         </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                         <InputLabel id="payment-type-label">Payment Type</InputLabel>
                         <Select
                              value={clientPaymentMethods?.some(method => method.id === paymentType.value) ? paymentType.value : ''}
                              name="Payment type"
                              label="Payment Type"
                              onChange={handlePaymentTypeChange}
                         >
                              {
                                   clientPaymentMethods?.map((paymentMethod: BaseEntity) => (
                                        <MenuItem key={paymentMethod.id} value={paymentMethod.id}>
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

