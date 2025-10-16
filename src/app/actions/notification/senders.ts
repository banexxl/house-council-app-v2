// notifications/senders.ts

import { createMessage } from "src/libs/sms/twilio";
import { logServerAction } from "src/libs/supabase/server-logging";
import { NotificationTypeMap } from "src/types/notification";

export async function sendViaWhatsApp(
     to: string,
     title: string,
     body: string,
     type: NotificationTypeMap
): Promise<{ ok: boolean; id?: string; status?: string; error?: string }> {
     try {
          const res = await createMessage(to, title, body, type);
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
          const id = await fakeMailerSend(to, subject, html); // replace
          return { ok: true, id };
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

// TEMP stub so this compiles until you wire your mailer:
async function fakeMailerSend(to: string, subject: string, html: string): Promise<string> {
     // no-op; return a pseudo id
     return `mail_${Date.now()}`;
}
