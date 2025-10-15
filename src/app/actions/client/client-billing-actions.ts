'use server';

import { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache"
import { TABLES } from "src/libs/supabase/tables";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { Client } from "src/types/client";
import { ClientBillingInformation } from "src/types/client-billing-information";

export const createOrUpdateClientBillingInformation = async (clientBillingInformation: ClientBillingInformation, billingInformationId?: string)
     : Promise<{ createOrUpdateClientBillingInformationSuccess: boolean, createOrUpdateClientBillingInformation?: ClientBillingInformation, createOrUpdateClientBillingInformationError?: any }> => {

     const supabase = await useServerSideSupabaseAnonClient();
     let result;

     if (billingInformationId && billingInformationId !== "") {
          // Update existing client billing information
          result = await supabase
               .from(TABLES.BILLING_INFORMATION)
               .update({
                    updated_at: new Date().toISOString(),
                    contact_person: clientBillingInformation.contact_person,
                    billing_address: clientBillingInformation.billing_address,
                    card_number: clientBillingInformation.card_number,
                    cvc: clientBillingInformation.cvc,
                    expiration_date: clientBillingInformation.expiration_date,
                    payment_method: clientBillingInformation.payment_method,
                    billing_status: clientBillingInformation.billing_status,
                    /////////////////////////////
                    cash_amount: Number(clientBillingInformation.cash_amount)
               })
               .eq('id', billingInformationId)
               .select()
               .single();
     } else {
          // Insert new client billing information
          result = await supabase
               .from(TABLES.BILLING_INFORMATION)
               .insert({
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    client_id: clientBillingInformation.client_id,
                    contact_person: clientBillingInformation.contact_person,
                    billing_address: clientBillingInformation.billing_address,
                    card_number: clientBillingInformation.card_number,
                    cvc: clientBillingInformation.cvc,
                    expiration_date: clientBillingInformation.expiration_date,
                    payment_method: clientBillingInformation.payment_method,
                    billing_status: clientBillingInformation.billing_status,
                    cash_amount: Number(clientBillingInformation.cash_amount)
               })
               .select()
               .single();

     }

     const { data, error } = result;

     if (error) {
          return { createOrUpdateClientBillingInformationSuccess: false, createOrUpdateClientBillingInformationError: error };
     }

     revalidatePath(`/dashboard/clients/billing-information/${clientBillingInformation.id}`);
     return { createOrUpdateClientBillingInformationSuccess: true, createOrUpdateClientBillingInformation: data };
}

export const readClientBillingInformation = async (id: string): Promise<{ readClientBillingInformationSuccess: boolean, readClientBillingInformationData?: ClientBillingInformation, readClientBillingInformationError?: string }> => {

     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase
          .from(TABLES.BILLING_INFORMATION)
          .select('*')
          .eq('id', id)
          .single();

     if (error) {
          return { readClientBillingInformationSuccess: false, readClientBillingInformationError: error.message };
     }

     return { readClientBillingInformationSuccess: true, readClientBillingInformationData: data ?? undefined };
}

export const deleteClientBillingInformation = async (ids: string[] | undefined): Promise<{ deleteClientBillingInformationSuccess: boolean, deleteClientBillingInformationError?: Partial<PostgrestError> }> => {

     const supabase = await useServerSideSupabaseAnonClient();

     if (ids?.length == 0) {
          return { deleteClientBillingInformationSuccess: false, deleteClientBillingInformationError: {} };
     }

     const { error } = await supabase
          .from(TABLES.BILLING_INFORMATION)
          .delete()
          .in('id', ids!);

     if (error) {
          if (error.code === '23503') {
               return { deleteClientBillingInformationSuccess: false, deleteClientBillingInformationError: { code: '23503', message: 'billingInfoError.foreignKeyConstraint' } };
          }
          return { deleteClientBillingInformationSuccess: false, deleteClientBillingInformationError: { code: 'UNKNOWN_ERROR', message: error.message } };
     }

     revalidatePath('/dashboard/clients/billing-information');
     revalidatePath('/dashboard/accounts');
     return { deleteClientBillingInformationSuccess: true };
}

export const readAllClientBillingInformation = async (): Promise<{
     readAllClientBillingInformationSuccess: boolean;
     readAllClientBillingInformationData?: (ClientBillingInformation & { client: Client })[];
     readAllClientBillingInformationError?: string;
}> => {

     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase
          .from(TABLES.BILLING_INFORMATION)
          .select(`
         *,
         client:client_id (*)
       `);

     if (error) {
          return {
               readAllClientBillingInformationSuccess: false,
               readAllClientBillingInformationError: error.message,
          };
     }

     return {
          readAllClientBillingInformationSuccess: true,
          readAllClientBillingInformationData: data as (ClientBillingInformation & { client: Client })[],
     };
};

export const readBillingInfoFromClientId = async (clientId: string): Promise<{ readClientBillingInformationSuccess: boolean; readClientBillingInformationData?: ClientBillingInformation[]; readClientBillingInformationError?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase
          .from(TABLES.BILLING_INFORMATION)
          .select('*')
          .eq('client_id', clientId)
     if (error) {
          return { readClientBillingInformationSuccess: false, readClientBillingInformationError: error.message }
     }
     return { readClientBillingInformationSuccess: true, readClientBillingInformationData: data }
}