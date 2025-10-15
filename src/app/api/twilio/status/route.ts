// app/api/twilio/status/route.ts
import { log } from 'console';
import { NextResponse } from 'next/server';
import twilio from 'twilio';

// OPTIONAL: Supabase server client (if you want to persist statuses)
// import { createClient } from '@supabase/supabase-js';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const publicBaseUrl = process.env.PUBLIC_BASE_URL!; // e.g. https://your-domain.com

// const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/**
 * Twilio posts x-www-form-urlencoded. For signature validation we need the exact body params.
 * We'll read the raw text, turn into URLSearchParams, and validate with twilio.validateRequest.
 */
export async function POST(req: Request) {
     try {
          const twilioSignature = req.headers.get('x-twilio-signature');
          if (!twilioSignature) {
               return NextResponse.json({ ok: false, error: 'Missing Twilio signature' }, { status: 400 });
          }

          // Read raw body (must be BEFORE using req.formData())
          const rawBody = await req.text();
          const params = Object.fromEntries(new URLSearchParams(rawBody));
          const requestUrl = `${publicBaseUrl}/api/twilio/status`;

          const valid = twilio.validateRequest(authToken, twilioSignature, requestUrl, params);
          if (!valid) {
               return NextResponse.json({ ok: false, error: 'Invalid Twilio signature' }, { status: 403 });
          }

          // Typical fields Twilio sends
          const messageSid = params.MessageSid as string | undefined;
          const messageStatus = params.MessageStatus as string | undefined; // queued|sent|delivered|read|undelivered|failed
          const to = params.To as string | undefined;
          const from = params.From as string | undefined;
          const errorCode = params.ErrorCode as string | undefined;
          const errorMessage = params.ErrorMessage as string | undefined;

          // You’ll get multiple callbacks per message as status changes. Handle idempotently.
          // Example: persist/update to your DB (Supabase example)
          /*
          if (messageSid) {
            const { error } = await supabase
              .from('wa_messages')
              .upsert({
                sid: messageSid,
                to,
                from,
                last_status: messageStatus,
                error_code: errorCode ?? null,
                error_message: errorMessage ?? null,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'sid' });
      
            if (error) {
              log('[twilio-status] DB upsert error:', 'error);
            }
          }
          */

          // You can branch on status for custom logic
          switch (messageStatus) {
               case 'delivered':
                    // e.g. mark “delivered_at”
                    break;
               case 'read':
                    // e.g. mark “read_at”
                    break;
               case 'undelivered':
               case 'failed':
                    // e.g. alert/log/retry
                    break;
               default:
                    // queued/sent/etc.
                    break;
          }

          log('[twilio-status] callback', { messageSid, messageStatus, to, from, errorCode, errorMessage });

          return NextResponse.json({ ok: true });
     } catch (err: any) {
          log('[twilio-status] error:', err?.message ?? err);
          return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
     }
}
