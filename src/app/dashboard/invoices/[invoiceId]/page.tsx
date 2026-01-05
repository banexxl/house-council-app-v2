import { redirect } from 'next/navigation';

import { getViewer } from 'src/libs/supabase/server-auth';
import { readInvoiceById } from 'src/app/actions/client/client-payment-actions';
import type { PolarOrder } from 'src/types/polar-order-types';
import { InvoiceDetailClient } from './invoice-detail-client';

interface InvoicePageProps {
  params: Promise<{ invoiceId: string }>;
}

const Page = async ({ params }: InvoicePageProps) => {
  const { client, tenant, admin, clientMember } = await getViewer();

  if (!client && !tenant && !admin && !clientMember) {
    redirect('/auth/login');
  }

  const { invoiceId } = await params;
  let invoice: PolarOrder | null = null;

  const { readInvoiceByIdSuccess, readInvoiceByIdData } = await readInvoiceById(invoiceId);

  if (readInvoiceByIdSuccess) {
    invoice = readInvoiceByIdData ?? null;
  }

  return <InvoiceDetailClient invoice={invoice} />;
};

export default Page;
