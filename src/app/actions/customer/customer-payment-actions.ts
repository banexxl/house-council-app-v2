'use server';

import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { PolarOrder } from 'src/types/polar-order-types';

export const readAllCustomerPayments = async (
     customerId: string
): Promise<{ readCustomerPaymentsSuccess: boolean; readCustomerPaymentsData?: PolarOrder[]; readCustomerPaymentsError?: string }> => {
     const start = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase
          .from(TABLES.POLAR_INVOICES)
          .select(`*`)
          .order('createdAt', { ascending: false })
          .eq('customerId', customerId);

     if (error) {
          await logServerAction({
               user_id: customerId,
               action: 'Read All Customer Payments - Error',
               payload: { customerId },
               status: 'fail',
               error: error.message,
               duration_ms: Date.now() - start,
               type: 'db',
          });
          return { readCustomerPaymentsSuccess: false, readCustomerPaymentsError: error.message };
     }

     await logServerAction({
          user_id: customerId,
          action: 'Read All Customer Payments - Success',
          payload: { customerId },
          status: 'success',
          error: '',
          duration_ms: Date.now() - start,
          type: 'db',
     });

     // Cast Supabase response to PolarOrder[]
     const orders = (data ?? []) as PolarOrder[];

     return { readCustomerPaymentsSuccess: true, readCustomerPaymentsData: orders };
};

export const readAllInvoices = async (): Promise<{
     readAllInvoicesSuccess: boolean;
     readAllInvoicesData?: PolarOrder[];
     readAllInvoicesError?: string;
}> => {
     const start = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase
          .from(TABLES.POLAR_INVOICES)
          .select(`*`)
          .order('createdAt', { ascending: false });

     if (error) {
          await logServerAction({
               user_id: 'system',
               action: 'Read All Invoices - Error',
               payload: {},
               status: 'fail',
               error: error.message,
               duration_ms: Date.now() - start,
               type: 'db',
          });
          return { readAllInvoicesSuccess: false, readAllInvoicesError: error.message };
     }

     await logServerAction({
          user_id: 'system',
          action: 'Read All Invoices - Success',
          payload: {},
          status: 'success',
          error: '',
          duration_ms: Date.now() - start,
          type: 'db',
     });

     const orders = (data ?? []) as PolarOrder[];

     return { readAllInvoicesSuccess: true, readAllInvoicesData: orders };
};

export const readInvoiceById = async (invoiceId: string): Promise<{
     readInvoiceByIdSuccess: boolean;
     readInvoiceByIdData?: PolarOrder | null;
     readInvoiceByIdError?: string;
}> => {
     const start = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase
          .from(TABLES.POLAR_INVOICES)
          .select(`*`)
          .eq('id', invoiceId)
          .maybeSingle();

     if (error) {
          await logServerAction({
               ...{
                    user_id: 'system',
                    action: 'Read Invoice By Id - Error',
                    payload: { invoiceId },
                    status: 'fail',
                    error: error.message,
                    duration_ms: Date.now() - start,
                    type: 'db',
               }
          });

          return { readInvoiceByIdSuccess: false, readInvoiceByIdError: error.message };
     }

     await logServerAction({
          ...{
               user_id: 'system',
               action: 'Read Invoice By Id - Success',
               payload: { invoiceId },
               status: 'success',
               error: '',
               duration_ms: Date.now() - start,
               type: 'db',
          }
     });

     return {
          readInvoiceByIdSuccess: true,
          readInvoiceByIdData: (data as PolarOrder) ?? null,
     };
};
