// app/wa/join/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
     const src = new URL(req.url);
     const k = (src.searchParams.get('k') || '').trim(); // keyword
     if (!k) {
          return new NextResponse('Missing keyword', { status: 400 });
     }

     const waFrom = process.env.TWILIO_SENDER_WHATSAPP_NUMBER || '';
     const phoneDigits = waFrom.replace(/\D/g, ''); // WhatsApp wants digits only
     const text = encodeURIComponent(`join ${k}`);

     const target = `https://api.whatsapp.com/send?phone=${phoneDigits}&text=${text}`;
     return NextResponse.redirect(target, { status: 302 });
}
