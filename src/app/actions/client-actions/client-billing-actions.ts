'use server';

import { supabase } from "src/libs/supabase/client";
import { ClientBillingInformation } from "src/types/client-billing-information";

export const createOrUpdateClientBillingInformation = async (clientBillingInformation: ClientBillingInformation, paymentMethodTypeId: string, billingInformationStatusId: string, billingInformationId?: string)
     : Promise<{ createOrUpdateClientBillingInformationSuccess: boolean, createOrUpdateClientBillingInformation?: ClientBillingInformation, createOrUpdateClientBillingInformationError?: any }> => {

     let result;

     if (billingInformationId && billingInformationId !== "") {
          // Update existing client billing information
          result = await supabase
               .from('tblClientBillingInformation')
               .update({
                    updated_at: new Date().toISOString(),
                    full_name: clientBillingInformation.full_name,
                    billing_address: clientBillingInformation.billing_address,
                    card_number: clientBillingInformation.card_number,
                    cvc: clientBillingInformation.cvc,
                    expiration_date: clientBillingInformation.expiration_date,
                    payment_method_id: paymentMethodTypeId,
                    billing_status_id: billingInformationStatusId
               })
               .eq('id', billingInformationId)
               .select()
               .single();
     } else {
          // Insert new client billing information
          result = await supabase
               .from('tblClientBillingInformation')
               .insert({
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
               })
               .select()
               .single();
     }

     const { data, error } = result;
     console.log('error', error);

     if (error) {
          return { createOrUpdateClientBillingInformationSuccess: false, createOrUpdateClientBillingInformationError: error };
     }

     return { createOrUpdateClientBillingInformationSuccess: true, createOrUpdateClientBillingInformation: data };
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

export const deleteClientBillingInformation = async (ids: string[] | undefined): Promise<{ deleteClientBillingInformationSuccess: boolean, deleteClientBillingInformationError?: string }> => {

     if (ids?.length == 0) {
          return { deleteClientBillingInformationSuccess: false, deleteClientBillingInformationError: "No IDs provided" };
     }

     const { error } = await supabase
          .from('tblClientBillingInformation')
          .delete()
          .in('id', ids!);

     if (error) {
          return { deleteClientBillingInformationSuccess: false, deleteClientBillingInformationError: error.message };
     }

     return { deleteClientBillingInformationSuccess: true };
}

export const readAllClientBillingInformation = async (p0: string): Promise<{ readAllClientBillingInformationSuccess: boolean, readAllClientBillingInformationData?: ClientBillingInformation[], readAllClientBillingInformationError?: string }> => {

     const { data, error } = await supabase
          .from('tblClientBillingInformation')
          .select('*');

     if (error) {
          return { readAllClientBillingInformationSuccess: false, readAllClientBillingInformationError: error.message };
     }

     return { readAllClientBillingInformationSuccess: true, readAllClientBillingInformationData: data ?? undefined };
}
