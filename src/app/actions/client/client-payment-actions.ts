'use server';

import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { PolarOrder } from 'src/types/polar-order-types';

export const readAllClientPayments = async (
     clientId: string
): Promise<{ readClientPaymentsSuccess: boolean; readClientPaymentsData?: PolarOrder[]; readClientPaymentsError?: string }> => {
     const start = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase
          .from(TABLES.INVOICES)
          .select(`*`)
          .order('created_at', { ascending: false })
          .eq('client_id', clientId);
     console.log('error', error);

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

     // Cast Supabase response to PolarOrder[]
     const orders = (data ?? []) as PolarOrder[];

     return { readClientPaymentsSuccess: true, readClientPaymentsData: orders };
};
