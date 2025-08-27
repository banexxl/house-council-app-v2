import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
     const ip = req.nextUrl.searchParams.get('ip');
     if (!ip) {
          return NextResponse.json({ error: 'Missing IP address' }, { status: 400 });
     }

     try {
          const response = await fetch(`https://api.apilayer.com/ip_to_location/${ip}`, {
               method: 'GET',
               headers: {
                    'apikey': 'pQPGwsqQa0Nauo0dEh6er61D24TZtgPM',
               },
               redirect: 'follow',
          });

          if (!response.ok) {
               return NextResponse.json({ error: 'Failed to fetch location' }, { status: response.status });
          }

          const data = await response.json();
          return NextResponse.json(data);
     } catch (error) {
          return NextResponse.json({ error: 'Error fetching location' }, { status: 500 });
     }
}
