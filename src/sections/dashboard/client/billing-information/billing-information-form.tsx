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
import { createOrUpdateClientBillingInformation } from "src/app/actions/client/client-billing-actions"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"
import { paths } from "src/paths"
import { ClientBillingInformation, ClientBillingInformationStatus, clientBillingInformationStatuses, clientBillingInformationStatusMapping } from "src/types/client-billing-information"
import { clientPaymentMethods, PaymentMethod, paymentMethodMapping } from "src/types/payment"

interface ClientBillingInformationFormProps {
     allClients?: Client[]
     billingInformationData?: ClientBillingInformation
}

export const ClientBillingInformationForm: React.FC<ClientBillingInformationFormProps> = ({ allClients, billingInformationData }) => {

     const router = useRouter()
     const { t } = useTranslation()

     const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')

     const [billingInformationStatus, setBillingInformationStatus] = useState<ClientBillingInformationStatus | ''>('');

     const handlePaymentMethodChange = (event: SelectChangeEvent) => {
          const paymentMethod = clientPaymentMethods?.find((p) => p === event.target.value)
          setPaymentMethod(paymentMethod || 'credit_card')
     }

     const handleBillingInformationStatusChange = (event: SelectChangeEvent) => {
          const status = clientBillingInformationStatuses?.find((p) => p === event.target.value)
          setBillingInformationStatus(status || 'active')
     }

     const handleSubmit = async (values: any, paymentMethodId: string, billingInformationStatusId: string) => {

          try {
               const response = await createOrUpdateClientBillingInformation(values, billingInformationData?.id);

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
          }
     }

     const renderForm = () => {
          switch (paymentMethod) {
               case "cash":
                    return <CashPaymentForm
                         clients={allClients ? allClients : []}
                         onSubmit={(values) => handleSubmit(values, paymentMethod!, billingInformationStatus)}
                         billingInformationData={billingInformationData}
                    />
               case "wire_transfer":
                    return <WireTransferForm
                         clients={allClients ? allClients : []}
                         onSubmit={(values) => handleSubmit(values, paymentMethod!, billingInformationStatus)}
                    />
               case "credit_card":
                    return <CardNumberForm
                         clients={allClients ? allClients : []}
                         onSubmit={(values: any) => handleSubmit(values, paymentMethod!, billingInformationStatus)}
                         billingInformationData={billingInformationData}
                    />
               case "bank_transfer":
                    return <BankTransferForm
                         clients={allClients ? allClients : []}
                         onSubmit={(values) => handleSubmit(values, paymentMethod!, billingInformationStatus)}
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
                    <FormControl fullWidth margin="normal" required error={!billingInformationStatus && clientBillingInformationStatuses!.length > 0}>
                         <TextField
                              select
                              value={billingInformationStatus}
                              name="status"
                              label={t('clients.clientBillingStatus')}
                              onChange={(e: any) => handleBillingInformationStatusChange(e)}
                              required
                         >
                              {
                                   clientBillingInformationStatuses?.map((status: string) => (
                                        <MenuItem key={status} value={status}>
                                             {t(clientBillingInformationStatusMapping[status as keyof typeof clientBillingInformationStatusMapping])}
                                        </MenuItem>
                                   ))
                              }
                         </TextField>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                         <TextField
                              select
                              value={clientPaymentMethods?.some(method => method === paymentMethod) ? paymentMethod : ''}
                              name="Payment type"
                              label={t('clients.clientPaymentMethod')}
                              onChange={(e: any) => handlePaymentMethodChange(e)}
                              required
                              disabled={billingInformationData && billingInformationData.id ? true : false}
                         >
                              {
                                   clientPaymentMethods?.map((paymentMethod: string) => (
                                        <MenuItem key={paymentMethod} value={paymentMethod}>
                                             {t(paymentMethodMapping[paymentMethod as keyof typeof paymentMethodMapping])}
                                        </MenuItem>
                                   ))
                              }
                         </TextField>
                    </FormControl>
                    {billingInformationStatus && paymentMethod && renderForm()}
               </CardContent>
          </Card>
     )
}

