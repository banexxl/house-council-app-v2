'use server';

import { revalidatePath } from "next/cache"
import { useServerSideSupabaseServiceRoleClient } from "src/libs/supabase/ss-supabase-service-role-client";
import { Client } from "src/types/client";
import { ClientBillingInformation } from "src/types/client-billing-information";

export const createOrUpdateClientBillingInformation = async (clientBillingInformation: ClientBillingInformation, paymentMethodTypeId: string, billingInformationStatusId: string, billingInformationId?: string)
     : Promise<{ createOrUpdateClientBillingInformationSuccess: boolean, createOrUpdateClientBillingInformation?: ClientBillingInformation, createOrUpdateClientBillingInformationError?: any }> => {

     const supabase = await useServerSideSupabaseServiceRoleClient();
     let result;

     if (billingInformationId && billingInformationId !== "") {
          // Update existing client billing information
          result = await supabase
               .from('tblBillingInformation')
               .update({
                    updated_at: new Date().toISOString(),
                    full_name: clientBillingInformation.full_name,
                    billing_address: clientBillingInformation.billing_address,
                    card_number: clientBillingInformation.card_number,
                    cvc: clientBillingInformation.cvc,
                    expiration_date: clientBillingInformation.expiration_date,
                    payment_method_id: paymentMethodTypeId,
                    billing_status_id: billingInformationStatusId,
                    /////////////////////////////
                    cash_amount: Number(clientBillingInformation.cash_amount)
               })
               .eq('id', billingInformationId)
               .select()
               .single();
     } else {
          // Insert new client billing information
          result = await supabase
               .from('tblBillingInformation')
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
                    billing_status_id: billingInformationStatusId,
                    cash_amount: Number(clientBillingInformation.cash_amount)
               })
               .select()
               .single();
     }

     const { data, error } = result;

     if (error) {
          return { createOrUpdateClientBillingInformationSuccess: false, createOrUpdateClientBillingInformationError: error };
     }

     revalidatePath(`/dashboard/clients/billing-information/${clientBillingInformation.client_id}`);
     return { createOrUpdateClientBillingInformationSuccess: true, createOrUpdateClientBillingInformation: data };
}

export const readClientBillingInformation = async (id: string): Promise<{ readClientBillingInformationSuccess: boolean, readClientBillingInformationData?: ClientBillingInformation, readClientBillingInformationError?: string }> => {

     const supabase = await useServerSideSupabaseServiceRoleClient();

     const { data, error } = await supabase
          .from('tblBillingInformation')
          .select('*')
          .eq('id', id)
          .single();

     if (error) {
          return { readClientBillingInformationSuccess: false, readClientBillingInformationError: error.message };
     }

     return { readClientBillingInformationSuccess: true, readClientBillingInformationData: data ?? undefined };
}

export const deleteClientBillingInformation = async (ids: string[] | undefined): Promise<{ deleteClientBillingInformationSuccess: boolean, deleteClientBillingInformationError?: string }> => {

     const supabase = await useServerSideSupabaseServiceRoleClient();

     if (ids?.length == 0) {
          return { deleteClientBillingInformationSuccess: false, deleteClientBillingInformationError: "No IDs provided" };
     }

     const { error } = await supabase
          .from('tblBillingInformation')
          .delete()
          .in('id', ids!);

     if (error) {
          return { deleteClientBillingInformationSuccess: false, deleteClientBillingInformationError: error.message };
     }

     revalidatePath('/dashboard/clients/billing-information');
     return { deleteClientBillingInformationSuccess: true };
}

export const readAllClientBillingInformation = async (): Promise<{
     readAllClientBillingInformationSuccess: boolean;
     readAllClientBillingInformationData?: (ClientBillingInformation & { client: Client })[];
     readAllClientBillingInformationError?: string;
}> => {

     const supabase = await useServerSideSupabaseServiceRoleClient();

     const { data, error } = await supabase
          .from("tblBillingInformation")
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
