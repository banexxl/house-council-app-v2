import { NextResponse } from 'next/server';

import { polar } from 'src/libs/polar/polar';

interface RouteParams {
     params: Promise<{ orderId: string }>;
}

export async function GET(_request: Request, context: RouteParams) {
     const { orderId } = await context.params;

     if (!orderId) {
          return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
     }

     try {
          // Ensure an invoice exists for this order in Polar. If it already exists,
          // Polar may return a conflict error which we can safely ignore.
          try {
               await polar.orders.invoice({ id: orderId });
          } catch (_err) {
               // Best-effort create; fall through to fetching the invoice.
          }

          const invoice = await polar.orders.invoice({ id: orderId });

          if (!invoice || !('url' in invoice) || !invoice.url) {
               return NextResponse.json(
                    { error: 'Invoice URL not available' },
                    { status: 404 }
               );
          }

          return NextResponse.json({ url: invoice.url });
     } catch (error) {
          console.error('[api/polar/invoices] Failed to generate invoice', error);

          return NextResponse.json(
               { error: 'Failed to generate invoice' },
               { status: 500 }
          );
     }
}
