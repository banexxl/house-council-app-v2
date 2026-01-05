import { redirect } from 'next/navigation';

import { getViewer } from 'src/libs/supabase/server-auth';
import { InvoiceDetailClient } from './invoice-detail-client';

interface InvoicePageProps {
  params: { invoiceId: string };
}

const Page = async ({ params }: InvoicePageProps) => {
  const { client, tenant, admin, clientMember } = await getViewer();

  if (!client && !tenant && !admin && !clientMember) {
    redirect('/auth/login');
  }

  const { invoiceId } = params;

  // TODO: Implement fetching a single PolarOrder by invoiceId and pass it to the client component.

  return <InvoiceDetailClient invoice={null} />;
};

export default Page;
