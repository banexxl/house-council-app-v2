'use server';

import { supabase } from "src/libs/supabase/client";
import { ClientBillingInformation } from "src/types/client-billing-information";

export const createClientBillingInformation = async (clientBillingInformation: ClientBillingInformation, paymentMethodTypeId: string, billingInformationStatusId: string)
     : Promise<{ createClientBillingInformationSuccess: boolean, createClientBillingInformation?: ClientBillingInformation, createClientBillingInformationError?: any }> => {

     console.log('clientBillingInformation', clientBillingInformation);


     const { data, error } = await supabase
          .from('tblClientBillingInformation')
          .insert(
               {
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    client_id: clientBillingInformation.client_id,
                    full_name: clientBillingInformation.full_name,
                    billing_address: clientBillingInformation.billing_address,
                    card_number: clientBillingInformation.card_number,
                    cvc: clientBillingInformation.cvc,
                    expiration_date: clientBillingInformation.expiration_date,
                    payment_method_id: paymentMethodTypeId,
                    billing_status_id: billingInformationStatusId
               }
          )
          .select() // this returns the inserted data if the operation is successful

     if (error) {
          return { createClientBillingInformationSuccess: false, createClientBillingInformationError: error };
     }

     return { createClientBillingInformationSuccess: true, createClientBillingInformation: data ? data[0] : undefined };
}

export const readClientBillingInformation = async (id: string): Promise<{ readClientBillingInformationSuccess: boolean, readClientBillingInformationData?: ClientBillingInformation, readClientBillingInformationError?: string }> => {

     const { data, error } = await supabase
          .from('tblClientBillingInformation')
          .select('*')
          .eq('id', id)
          .single();

     if (error) {
          return { readClientBillingInformationSuccess: false, readClientBillingInformationError: error.message };
     }

     return { readClientBillingInformationSuccess: true, readClientBillingInformationData: data ?? undefined };
}

export const updateClientBillingInformation = async (id: number, clientBillingInformation: ClientBillingInformation): Promise<{ updateClientBillingInformationSuccess: boolean, updateClientBillingInformation?: ClientBillingInformation, updateClientBillingInformationError?: any }> => {
     const { data, error } = await supabase
          .from('tblClientBillingInformation')
          .update(clientBillingInformation)
          .eq('id', id)
          .single();

     if (error) {
          return { updateClientBillingInformationSuccess: false, updateClientBillingInformationError: error };
     }

     return { updateClientBillingInformationSuccess: true, updateClientBillingInformation: data ?? undefined };
}

export const deleteClientBillingInformation = async (id: number): Promise<{ deleteClientBillingInformationSuccess: boolean, deleteClientBillingInformationError?: string }> => {
     const { error } = await supabase
          .from('tblClientBillingInformation')
          .delete()
          .eq('id', id);

     if (error) {
          return { deleteClientBillingInformationSuccess: false, deleteClientBillingInformationError: error.message };
     }

     return { deleteClientBillingInformationSuccess: true };
}
