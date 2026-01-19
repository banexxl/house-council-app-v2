import { NextResponse } from 'next/server';
import { syncPolarSeatsForClient } from 'src/libs/polar/sync-subscription-seats';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';

export async function POST(request: Request) {

     //Get all Customer IDs from the tblPolarCustomers
     const supabase = await useServerSideSupabaseAnonClient();
     const { data: customers, error: customersError } = await supabase
          .from('tblPolarCustomers')
          .select('customerId');


     try {
          if (!customers || customersError) {
               return NextResponse.json({ success: false, error: customersError?.message || 'Failed to fetch customers' }, { status: 500 });
          }

          const results = [];
          for (const customer of customers) {
               const customerId = customer.customerId;
               if (!customerId || typeof customerId !== 'string') {
                    results.push({ customerId, success: false, error: 'Invalid or missing customerId' });
                    continue;
               }
               const result = await syncPolarSeatsForClient({ customerId });
               results.push({ customerId, ...result });
          }

          return NextResponse.json({ success: true, results });
     } catch (error) {
          return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
     }
}