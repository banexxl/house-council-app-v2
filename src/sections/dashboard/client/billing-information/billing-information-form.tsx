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
import { notFound, useRouter } from "next/navigation"
import { paths } from "src/paths"
import { BaseEntity } from "src/app/actions/base-entity-actions"
import { ClientBillingInformation } from "src/types/client-billing-information"
import { isUUIDv4 } from "src/utils/uuid"

interface ClientBillingInformationFormProps {
     allClients?: Client[]
     clientPaymentMethods?: BaseEntity[]
     billingInformationStatuses?: BaseEntity[]
     billingInformationData?: ClientBillingInformation
     clientBillingInformationStatus?: { value: string; name: string }
     clientPaymentMethod?: { value: string; name: string }
}

export const ClientBillingInformationForm: React.FC<ClientBillingInformationFormProps> = ({ allClients, clientPaymentMethods, billingInformationStatuses, billingInformationData, clientBillingInformationStatus, clientPaymentMethod }) => {

     const router = useRouter()
     const { t } = useTranslation()

     if (!isUUIDv4(billingInformationData?.id)) {
          notFound()
     }

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

          try {
               const response = await createOrUpdateClientBillingInformation(values, paymentMethodId, billingInformationStatusId, billingInformationData?.id);

               response.createOrUpdateClientBillingInformationSuccess
                    ? (
                         toast.success(t('clients.clientPaymentMethodSaved')),
                         router.push(paths.dashboard.clients.billingInformation.details + '/' + response.createOrUpdateClientBillingInformation?.id)
                    )
                    : response.createOrUpdateClientBillingInformationError.code === '23505'
                         ? toast.error(t('errors.client.clientPaymentMethodError') + ': \n' + t('errors.client.uniqueCreditCardNumberViolation'))
                         : response.createOrUpdateClientBillingInformationError.code === '22P02'
                              ? toast.error(t('errors.client.clientPaymentMethodError') + ': \n' + t('errors.client.dataTypeMismatch'))
                              : null;

          } catch (error) {
               toast.error(t('errors.client.clientPaymentMethodError'));
          } finally {
               console.log('finally');

          }
     }

     const renderForm = () => {
          switch (clientPaymentMethod && clientPaymentMethod?.value !== '' ? clientPaymentMethod!.name : paymentMethod.name) {
               case "Cash":
                    return <CashPaymentForm
                         clients={allClients ? allClients : []}
                         onSubmit={(values) => handleSubmit(values, paymentMethod.value!, billingInformationStatus.value)}
                         billingInformationData={billingInformationData}
                    />
               case "Wire Transfer":
                    return <WireTransferForm
                         clients={allClients ? allClients : []}
                         onSubmit={(values) => handleSubmit(values, paymentMethod.value!, billingInformationStatus.value)}
                    />
               case "Credit Card":
                    return <CardNumberForm
                         clients={allClients ? allClients : []}
                         onSubmit={(values: any) => handleSubmit(values, paymentMethod.value!, billingInformationStatus.value)}
                         billingInformationData={billingInformationData}
                    />
               case "Bank Transfer":
                    return <BankTransferForm
                         clients={allClients ? allClients : []}
                         onSubmit={(values) => handleSubmit(values, paymentMethod.value!, billingInformationStatus.value)}
                    />
               default:
                    return null
          }
     }

     return (
          <Card sx={{ maxWidth: 600 }}>
               <CardContent>
                    {
                         billingInformationData && billingInformationData.id ?
                              <Typography variant="h4" gutterBottom>
                                   {t('clients.clientBillingInformationEdit')}
                              </Typography>
                              :
                              <Typography variant="h4" gutterBottom>
                                   {t('clients.clientBillingInformationCreate')}
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
                              disabled={billingInformationData && billingInformationData.id ? true : false}
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

