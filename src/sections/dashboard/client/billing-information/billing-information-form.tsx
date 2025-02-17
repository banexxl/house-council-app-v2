'use client'

import type React from "react"
import { useState } from "react"
import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent, Typography, CardContent, Card, TextField, CardHeader } from "@mui/material"
import { Client } from "src/types/client"
import WireTransferForm from "./wire-transfer-form"
import { CardNumberForm } from "./credit-card-form"
import CashPaymentForm from "./cash-payment-form"
import BankTransferForm from "./bank-transfer-form"
import { useTranslation } from "react-i18next"
import { createOrUpdateClientBillingInformation } from "src/app/actions/client-actions/client-billing-actions"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"
import { paths } from "src/paths"
import { BaseEntity } from "src/app/actions/base-entity-services"
import { ClientBillingInformation } from "src/types/client-billing-information"

interface ClientBillingInformationFormProps {
     allClients?: Client[]
     clientPaymentMethods?: BaseEntity[]
     billingInformationStatuses?: BaseEntity[]
     billingInformationData?: ClientBillingInformation
     clientBillingInformationStatus?: { value: string; name: string }
     clientPaymentMethod?: { value: string; name: string }
}

export const ClientBillingInformationForm: React.FC<ClientBillingInformationFormProps> = ({ allClients, clientPaymentMethods, billingInformationStatuses, billingInformationData, clientBillingInformationStatus, clientPaymentMethod }) => {

     const [isSubmitting, setIsSubmitting] = useState(false)
     const router = useRouter()
     const { t } = useTranslation()

     const [paymentMethod, setPaymentMethod] = useState<{ value?: string; name?: string }>({
          value: "",
          name: "",
          ...clientPaymentMethod
     })

     const [billingInformationStatus, setBillingInformationStatus] = useState<{ value: string; name: string }>({
          value: billingInformationStatuses?.[0]?.id || "",
          name: billingInformationStatuses?.[0]?.name || "",
          ...clientBillingInformationStatus
     });

     const handlePaymentMethodChange = (event: SelectChangeEvent) => {
          const paymentMethod = clientPaymentMethods?.find((p) => p.id === event.target.value)
          setPaymentMethod({ value: event.target.value, name: paymentMethod?.name || "" })
     }

     const handleBillingInformationStatusChange = (event: SelectChangeEvent) => {
          const status = billingInformationStatuses?.find((p) => p.id === event.target.value)
          setBillingInformationStatus({ value: event.target.value, name: status?.name || "" })
     }

     const handleSubmit = async (values: any, paymentMethodId: string, billingInformationStatusId: string) => {

          setIsSubmitting(true)

          try {
               const response = await createOrUpdateClientBillingInformation(values, paymentMethodId, billingInformationStatusId, billingInformationData?.id);
               if (response.createOrUpdateClientBillingInformationSuccess) {
                    toast.success(t('clients.clientPaymentMethodSaved'));
                    router.push(paths.dashboard.clients.billingInformation.details + '/' + response.createOrUpdateClientBillingInformation?.id)
               } else if (response.createOrUpdateClientBillingInformationError.code == '23505') {
                    toast.error(t('errors.client.clientPaymentMethodError') + ': \n' + t('errors.client.uniqueCreditCardNumberViolation'));
               }
          } catch (error) {
               toast.error(t('errors.client.clientPaymentMethodError'));
          } finally {
               setIsSubmitting(false)
          }
     }

     const renderForm = () => {
          switch (clientPaymentMethod && clientPaymentMethod?.value !== '' ? clientPaymentMethod!.name : paymentMethod.name) {
               case "Cash":
                    return <CashPaymentForm clients={allClients ? allClients : []} onSubmit={(values) => handleSubmit(values, paymentMethod.value!, billingInformationStatus.value)} />
               case "Wire Transfer":
                    return <WireTransferForm clients={allClients ? allClients : []} onSubmit={(values) => handleSubmit(values, paymentMethod.value!, billingInformationStatus.value)} />
               case "Credit Card":
                    return <CardNumberForm clients={allClients ? allClients : []} onSubmit={(values: any) => handleSubmit(values, paymentMethod.value!, billingInformationStatus.value)} isSubmitting={isSubmitting} billingInformationData={billingInformationData} />
               case "Bank Transfer":
                    return <BankTransferForm clients={allClients ? allClients : []} onSubmit={(values) => handleSubmit(values, paymentMethod.value!, billingInformationStatus.value)} />
               default:
                    return null
          }
     }

     return (
          <Card>
               <CardContent>
                    {
                         billingInformationData && billingInformationData.id ?
                              <Typography variant="h4" gutterBottom>
                                   {t('clients.clientEditPaymentMethod')}
                              </Typography>
                              :
                              <Typography variant="h4" gutterBottom>
                                   {t('clients.clientAddPaymentMethod')}
                              </Typography>
                    }
               </CardContent>
               <CardContent>
                    <FormControl fullWidth margin="normal" required error={!billingInformationStatus.value && billingInformationStatuses!.length > 0}>
                         <TextField
                              select
                              value={billingInformationStatus.value || billingInformationStatuses?.[0]?.id}
                              name="status"
                              label={t('clients.clientBillingStatus')}
                              onChange={(e: any) => handleBillingInformationStatusChange(e)}
                              required
                         >
                              {
                                   billingInformationStatuses?.map((status: BaseEntity) => (
                                        <MenuItem key={status.id} value={status.id}>
                                             {status.name}
                                        </MenuItem>
                                   ))
                              }
                         </TextField>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                         <TextField
                              select
                              value={clientPaymentMethods?.some(method => method.id === paymentMethod.value) ? paymentMethod.value : ''}
                              name="Payment type"
                              label={t('clients.clientPaymentMethod')}
                              onChange={(e: any) => handlePaymentMethodChange(e)}
                              required
                         >
                              {
                                   clientPaymentMethods?.map((paymentMethod: BaseEntity) => (
                                        <MenuItem key={paymentMethod.id} value={paymentMethod.id}>
                                             {paymentMethod.name}
                                        </MenuItem>
                                   ))
                              }
                         </TextField>
                    </FormControl>
                    {renderForm()}
               </CardContent>
          </Card>
     )
}

