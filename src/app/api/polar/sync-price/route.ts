import { NextResponse } from 'next/server';
import { syncPolarSeatsForClient } from 'src/libs/polar/sync-subscription-seats';

export async function POST(request: Request) {

     try {
          const { customerId } = await request.json();
          if (!customerId || typeof customerId !== 'string') {
               return NextResponse.json({ success: false, error: 'Invalid or missing customerId' }, { status: 400 });
          }
          const result = await syncPolarSeatsForClient({ customerId });
          if (!result.success) {
               return NextResponse.json({ success: false, error: result.error }, { status: 500 });
          }
          return NextResponse.json({ success: true });
     } catch (error) {
          return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
     }
}