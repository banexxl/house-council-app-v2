import { NextRequest, NextResponse } from 'next/server';
import { submitAccessRequest } from 'src/app/actions/access-request/access-request-actions';

export async function POST(req: NextRequest) {
     let body: any;
     try {
          body = await req.json();
     } catch {
          return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
     }

     const {
          name,
          email,
          message,
          buildingId,
          buildingLabel,
          apartmentId,
          apartmentLabel,
          recaptchaToken,
          formSecret,
     } = body || {};

     const required = {
          name,
          email,
          buildingId,
          apartmentId,
          recaptchaToken,
          formSecret,
     };

     const missing = Object.entries(required)
          .filter(([_, value]) => typeof value !== 'string' || value.trim().length === 0)
          .map(([key]) => key);

     if (missing.length) {
          return NextResponse.json(
               { success: false, error: `Missing required fields: ${missing.join(', ')}` },
               { status: 400 }
          );
     }

     const result = await submitAccessRequest({
          name,
          email,
          message,
          buildingId,
          buildingLabel,
          apartmentId,
          apartmentLabel,
          recaptchaToken,
          formSecret,
     });

     if (!result.success) {
          return NextResponse.json(
               { success: false, error: result.error || 'Failed to submit access request' },
               { status: 400 }
          );
     }

     return NextResponse.json({ success: true });
}

export async function GET() {
     return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
