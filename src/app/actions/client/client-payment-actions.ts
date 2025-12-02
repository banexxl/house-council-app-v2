'use server';

import { revalidatePath } from 'next/cache';
import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Invoice } from 'src/types/payment';

export const createOrUpdateClientPayment = async (
     payment: Invoice
): Promise<{
     success: boolean;
     data?: Invoice;
     error?: string;
}> => {
     const start = Date.now();
     const supabase = await useServerSideSupabaseServiceRoleClient();
     let result;

     if (payment.id) {
          result = await supabase
               .from(TABLES.INVOICES)
               .update({
                    updated_at: new Date().toISOString(),
                    total_paid: payment.total_paid,
                    invoice_number: payment.invoice_number,
                    subscription_plan: payment.subscription_plan,
                    client: payment.client,
                    billing_information: payment.billing_information,
                    status: payment.status,
                    currency: payment.currency,
                    refunded_at: payment.refunded_at,
                    is_recurring: payment.is_recurring,
               })
               .eq('id', payment.id)
               .select()
               .single();
     } else {
          result = await supabase
               .from(TABLES.INVOICES)
               .insert({
                    id: payment.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    total_paid: payment.total_paid,
                    invoice_number: payment.invoice_number,
                    subscription_plan: payment.subscription_plan,
                    client: payment.client,
                    billing_information: payment.billing_information,
                    status: payment.status,
                    currency: payment.currency,
                    refunded_at: payment.refunded_at,
                    is_recurring: payment.is_recurring,
               })
               .select()
               .single();
     }

     const { data, error } = result;
     if (error) {
          await logServerAction({
               user_id: payment.client.id!,
               action: 'Create or Update Client Invoice - Error',
               payload: { payment },
               status: 'fail',
               error: error.message,
               duration_ms: Date.now() - start,
               type: 'db',
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          user_id: payment.client.id!,
          action: 'Create or Update Client Invoice - Success',
          payload: { payment },
          status: 'success',
          error: '',
          duration_ms: Date.now() - start,
          type: 'db',
     });

     revalidatePath(`/profile/${payment.client}`);
     return { success: true, data };
};

export const readClientPayment = async (
     id: string
): Promise<{ success: boolean; data?: Invoice; error?: string }> => {
     const start = Date.now();
     const supabase = await useServerSideSupabaseServiceRoleClient();

     const { data, error } = await supabase.from(TABLES.INVOICES)
          .select(
               '*',

          ).eq('id', id).single();

     if (error) {
          await logServerAction({
               user_id: id,
               action: 'Read Client Invoice - Error',
               payload: { id },
               status: 'fail',
               error: error.message,
               duration_ms: Date.now() - start,
               type: 'db',
          });
          return { success: false, error: error.message };
     }

     return { success: true, data };
};

export const deleteClientPayment = async (
     clientId: string,
     ids: string[]
): Promise<{ success: boolean; error?: string }> => {
     const start = Date.now();
     const supabase = await useServerSideSupabaseServiceRoleClient();

     const { error } = await supabase.from(TABLES.INVOICES).delete().in('id', ids);

     if (error) {
          await logServerAction({
               user_id: clientId,
               action: 'Delete Client Invoice - Error',
               payload: { ids },
               status: 'fail',
               error: error.message,
               duration_ms: Date.now() - start,
               type: 'db',
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          user_id: clientId,
          action: 'Delete Client Invoice - Success',
          payload: { ids },
          status: 'success',
          error: '',
          duration_ms: Date.now() - start,
          type: 'action',
     });

     revalidatePath(`/profile/${clientId}`);
     return { success: true };
};

export const readAllClientPayments = async (
     clientId: string
): Promise<{ readClientPaymentsSuccess: boolean; readClientPaymentsData?: Invoice[]; readClientPaymentsError?: string }> => {
     const start = Date.now();
     const supabase = await useServerSideSupabaseServiceRoleClient();

     const { data, error } = await supabase
          .from(TABLES.INVOICES)
          .select(`*, currency:tblCurrencies (*), billing_information:tblBillingInformation (*), client:tblClients (*)`)
          .order('created_at', { ascending: false })
          .eq('client', clientId);

     if (error) {
          await logServerAction({
               user_id: clientId,
               action: 'Read All Client Payments - Error',
               payload: { clientId },
               status: 'fail',
               error: error.message,
               duration_ms: Date.now() - start,
               type: 'db',
          });
          return { readClientPaymentsSuccess: false, readClientPaymentsError: error.message };
     }

     await logServerAction({
          user_id: clientId,
          action: 'Read All Client Payments - Success',
          payload: { clientId },
          status: 'success',
          error: '',
          duration_ms: Date.now() - start,
          type: 'db',
     });

     return { readClientPaymentsSuccess: true, readClientPaymentsData: data };
};
