import { sendNotificationEmail } from "src/libs/email/node-mailer";
import { logServerAction } from "src/libs/supabase/server-logging";
import log from "src/utils/logger";

export async function sendViaEmail(
     to: string | string[],
     subject: string,
     html: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
     const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
     log(`sendViaEmail: toCount=${recipients.length} subject=${subject}`);
     try {
          // Implement with your mailer of choice (Nodemailer/Ses/Resend). Example signature:
          // const id = await mailer.send({ to, subject, html });
          const sendemailResponse = await sendNotificationEmail(
               recipients,
               subject,
               html,
               undefined,
               { mode: recipients.length > 1 ? 'bcc' : 'to' }
          );
          if (!sendemailResponse.ok) {
               log(`Email send result: fail error=${sendemailResponse.error || 'n/a'}`, 'error');
               return { ok: false, error: sendemailResponse.error || 'send failed' };
          }
          log(`Email send result: success`, 'warn');
          return { ok: true };
     } catch (e: any) {
          await logServerAction({
               action: 'Email Send',
               error: e?.message || String(e),
               payload: { to: recipients, subject },
               status: 'fail',
               type: 'external',
               user_id: null,
               created_at: new Date(),
               duration_ms: 0,
          });
          return { ok: false, error: e?.message || String(e) };
     }
}
