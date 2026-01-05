import { redirect } from 'next/navigation';

import { getViewer } from 'src/libs/supabase/server-auth';
import { readAllInvoices } from 'src/app/actions/client/client-payment-actions';
import type { PolarOrder } from 'src/types/polar-order-types';
import { InvoicesClient } from './invoices-client';

const Page = async () => {
  const { client, tenant, admin, clientMember } = await getViewer();

  if (!client && !tenant && !admin && !clientMember) {
    redirect('/auth/login');
  }

  let invoices: PolarOrder[] = [];

  const { readAllInvoicesSuccess, readAllInvoicesData } = await readAllInvoices();
  if (readAllInvoicesSuccess && readAllInvoicesData) {
    invoices = readAllInvoicesData;
  }

  return <InvoicesClient invoices={invoices} />;
};

export default Page;
