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

