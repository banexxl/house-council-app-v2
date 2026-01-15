import { redirect } from 'next/navigation';

import { getViewer } from 'src/libs/supabase/server-auth';
import { readAllInvoices } from 'src/app/actions/customer/customer-payment-actions';
import type { PolarOrder } from 'src/types/polar-order-types';
import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
// import { InvoicesClient } from './invoices-client';

const Page = async () => {
     const { customer, tenant, admin } = await getViewer();

     if (!customer && !tenant && !admin) {
          redirect('/auth/login');
     }

     if (!admin) {
          redirect('/');
     }

     let invoices: PolarOrder[] = [];

     const { readAllInvoicesSuccess, readAllInvoicesData } = await readAllInvoices();
     if (readAllInvoicesSuccess && readAllInvoicesData) {
          invoices = readAllInvoicesData;
     }

     // Fetch distinct clients referenced by invoices for sidebar filtering
     let invoiceClients: { id: string; name: string }[] = [];

     const clientIds = Array.from(
          new Set(
               invoices
                    .map((invoice) => invoice.customerId)
                    .filter((id): id is string => Boolean(id))
          )
     );

     if (clientIds.length > 0) {
          const supabase = await useServerSideSupabaseAnonClient();

          const { data, error } = await supabase
               .from(TABLES.POLAR_CUSTOMERS)
               .select('id, name')
               .in('id', clientIds);

          if (!error && data) {
               invoiceClients = data.map((client) => ({ id: client.id as string, name: client.name as string }));
          }
     }

     return
     <></>
     // <InvoicesClient invoices={invoices} invoiceClients={invoiceClients} />;
};

export default Page;
