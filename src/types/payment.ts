import { Client } from "./client";
import { ClientBillingInformation } from "./client-billing-information";

export type PaymentMethod =
     | 'not_selected'
     | 'cash'
     | 'wire_transfer'
     | 'bank_transfer'
     | 'invoice_billing'
     | 'paypal'
     | 'check'
     | 'cryptocurrency'
     | 'credit_card';

export const clientPaymentMethods: PaymentMethod[] = [
     'not_selected',
     'cash',
     'wire_transfer',
     'bank_transfer',
     'invoice_billing',
     'paypal',
     'check',
     'cryptocurrency',
     'credit_card',
];

export const paymentMethodMapping: Record<PaymentMethod, string> = {
     not_selected: 'payments.lblPaymentMethodNotSelected',
     cash: 'payments.lblPaymentMethodCash',
     wire_transfer: 'payments.lblPaymentMethodWireTransfer',
     bank_transfer: 'payments.lblPaymentMethodBankTransfer',
     invoice_billing: 'payments.lblPaymentMethodInvoiceBilling',
     paypal: 'payments.lblPaymentMethodPayPal',
     check: 'payments.lblPaymentMethodCheck',
     cryptocurrency: 'payments.lblPaymentMethodCryptocurrency',
     credit_card: 'payments.lblPaymentMethodCreditCard',
};

export type Invoice = {
     id?: string; // uuid
     created_at: Date; // ISO timestamp
     updated_at: Date; // ISO timestamp
     total_paid: number;
     invoice_number: string;
     subscription_plan: string; // uuid
     client: Client
     billing_information: ClientBillingInformation; // uuid
     status: string; // uuid
     currency: string;
     refunded_at: string | null;
     is_recurring: boolean;
     tax_percentage: number; // percentage value
     notes?: string;
     invoice_url?: string
}

