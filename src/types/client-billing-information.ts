import { PaymentMethod } from "./payment";

export type ClientBillingInformationStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export const clientBillingInformationStatuses: ClientBillingInformationStatus[] = [
     'active',
     'inactive',
     'pending',
     'suspended',
];

export const clientBillingInformationStatusMapping: Record<ClientBillingInformationStatus, string> = {
     active: 'clients.billingInformationStatusActive',
     inactive: 'clients.billingInformationStatusInactive',
     pending: 'clients.billingInformationStatusPending',
     suspended: 'clients.billingInformationStatusSuspended',
};

export type ClientBillingInformation = {
     id: string;
     created_at?: number;
     updated_at?: number;
     client_id: string;
     payment_method: PaymentMethod;
     contact_person: string;
     billing_address: string;
     billing_status: ClientBillingInformationStatus;
     // card details
     card_number?: string | null;
     cvc?: number;
     expiration_date?: Date;
     // cash payment
     cash_amount?: number;
}

export const clientBillingInformationInitialValues: ClientBillingInformation = {
     id: '',
     created_at: 0,
     updated_at: 0,
     client_id: '',
     payment_method: 'credit_card',
     contact_person: '',
     billing_address: '',
     billing_status: 'active',
     card_number: null,
     cvc: 0,
     expiration_date: new Date(),
     cash_amount: 0
};   