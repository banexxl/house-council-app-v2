export type ClientBillingInformation = {
     id?: string;
     created_at?: number;
     updated_at?: number;
     client_id: string;
     payment_method_id: string;
     card_number?: string;
     full_name: string;
     billing_address: string;
     billing_status: string;
     cvc: number;
     expiration_date: string;
}