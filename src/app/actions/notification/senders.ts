// notifications/senders.ts

import { sendNotificationEmail } from "src/libs/email/node-mailer";
import { createMessage } from "src/libs/whatsapp/twilio";
import { logServerAction } from "src/libs/supabase/server-logging";
import { NotificationTypeMap } from "src/types/notification";
import log from "src/utils/logger";

export async function sendViaWhatsApp(
     to: string,
     title: string,
     body: string,
     type: NotificationTypeMap
): Promise<{ ok: boolean; id?: string; status?: string; error?: string }> {
     try {
          const res = await createMessage(to, title, body, type);
          log(`WhatsApp send result: ${res?.sid ? 'success' : 'fail'} id=${res?.sid || 'n/a'} status=${res?.status || 'n/a'}`, res?.sid ? 'warn' : 'error');
          return { ok: !!res?.sid, id: res?.sid, status: res?.status };
     } catch (e: any) {
          return { ok: false, error: e?.message || String(e) };
     }
}

export async function sendViaEmail(
     to: string,
     subject: string,
     html: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
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
