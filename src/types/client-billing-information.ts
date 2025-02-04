export type ClientBillingInformation = {
     id?: string;
     created_at?: number;
     updated_at?: number;
     client_id: string;
     payment_method_id: string;
     card_number?: string;
     billing_name: string;
     billing_address: string;
     billing_status: string;
}

export type ClientBillingInformationStatus = {
     id?: string;
     created_at?: number;
     updated_at?: number;
     billing_information_name: string;
     billing_information_description: string;
}