export type ClientBillingInformation = {
     id: string;
     created_at?: number;
     updated_at?: number;
     client_id: string;
     payment_method_id: string;
     full_name: string;
     billing_address: string;
     billing_status_id: string;
     // card details
     card_number?: string;
     cvc?: string;
     expiration_date?: Date;
}

export const clientBillingInformationInitialValues: ClientBillingInformation = {
     id: '',
     created_at: 0,
     updated_at: 0,
     client_id: '',
     payment_method_id: '',
     full_name: '',
     billing_address: '',
     billing_status_id: '',
     card_number: '',
     cvc: '',
     expiration_date: new Date()
};   