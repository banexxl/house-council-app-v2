import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {

     const ip = req.nextUrl.searchParams.get('ip');
     if (!ip) {
          return NextResponse.json({ error: 'Missing IP address' }, { status: 400 });
     }

     // Check for localhost or invalid IPs
     const isLocalhost =
          ip === '127.0.0.1' ||
          ip === '::1' ||
          ip === 'localhost' ||
          ip.startsWith('192.168.') ||
          ip.startsWith('10.') ||
          ip.startsWith('172.') ||
          /^0+\.?0*\.?0*\.?0*$/.test(ip);

     // Simple IPv4/IPv6 regex (not exhaustive, but enough for basic validation)
     const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/;
     const ipv6Regex = /^([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}$/;
     const isValidIp = ipv4Regex.test(ip) || ipv6Regex.test(ip);

     if (isLocalhost || !isValidIp) {
          return NextResponse.json({ error: 'Invalid or local IP address' }, { status: 400 });
     }

     try {
          const response = await fetch(`https://api.apilayer.com/ip_to_location/${ip}`, {
               method: 'GET',
               headers: {
                    'apikey': process.env.API_LAYER_KEY!
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
