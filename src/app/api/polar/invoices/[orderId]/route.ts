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
          } catch {
               // Best-effort create; fall through to fetching the invoice.
          }

          const invoice = await polar.orders.invoice({ id: orderId });

          if (!invoice || !('url' in invoice) || !invoice.url) {
               return NextResponse.json(
                    { error: 'Invoice URL not available' },
                    { status: 404 }
               );
          }

          // Fetch the actual PDF from Polar so we can control headers and
          // display it inline in the browser instead of triggering a download.
          const upstream = await fetch(invoice.url);

          if (!upstream.ok || !upstream.body) {
               return NextResponse.json(
                    { error: 'Failed to fetch invoice PDF' },
                    { status: 502 }
               );
          }

          return new Response(upstream.body, {
               status: 200,
               headers: {
                    'Content-Type': 'application/pdf',
                    // Force inline display instead of download
                    'Content-Disposition': `inline; filename="invoice-${orderId}.pdf"`,
               },
          });
     } catch (error) {
          console.error('[api/polar/invoices] Failed to generate invoice', error);

          return NextResponse.json(
               { error: 'Failed to generate invoice' },
               { status: 500 }
          );
     }
}
