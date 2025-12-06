// notifications/senders.ts

import { sendNotificationEmail } from "src/libs/email/node-mailer";
import { logServerAction } from "src/libs/supabase/server-logging";
import log from "src/utils/logger";

export async function sendViaEmail(
     to: string,
     subject: string,
     html: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
     log(`sendViaEmail: to=${to} subject=${subject}`);
     try {
          // Implement with your mailer of choice (Nodemailer/Ses/Resend). Example signature:
          // const id = await mailer.send({ to, subject, html });
          const sendemailResponse = await sendNotificationEmail([to], subject, html);
          log(`Email send result: ${sendemailResponse ? 'success' : 'fail'} id=${sendemailResponse || 'n/a'}`, sendemailResponse ? 'warn' : 'error');
          return { ok: true };
     } catch (e: any) {
          await logServerAction({
               action: 'Email Send',
               error: e?.message || String(e),
               payload: { to, subject },
               status: 'fail',
               type: 'external',
               user_id: null,
               created_at: new Date(),
               duration_ms: 0,
          });
          return { ok: false, error: e?.message || String(e) };
     }
}
