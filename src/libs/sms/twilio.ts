// Server-only Twilio helper. Avoid static imports so that this file never gets
// pulled into an Edge runtime bundle (Twilio needs Node core modules).
import 'server-only';
import { logServerAction } from "../supabase/server-logging";
import { NotificationTypeMap } from "src/types/notification";

// We lazy-load the library so Next.js / Vercel won't attempt to resolve the
// internal twilio ../lib path in an unsupported runtime.
let _twilioClient: any | null = null;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
// NOTE: The canonical env var name is usually TWILIO_AUTH_TOKEN; the project uses TWILIO_API_TOKEN.
// Ensure the prod environment actually sets TWILIO_API_TOKEN (or alias it below).
const authToken = process.env.TWILIO_API_TOKEN || process.env.TWILIO_AUTH_TOKEN;
const numberFrom = process.env.TWILIO_SENDER_PHONE_NUMBER;

async function getTwilioClient() {
     if (_twilioClient) return _twilioClient;
     if (!accountSid || !authToken) {
          // We still return null; caller will log a more specific message.
          return null;
     }
     // Dynamic import keeps it out of edge bundles and fixes the '../lib/index.js' production resolution error.
     const twilioModule: any = await import('twilio');
     // Twilio v5 default export vs named: handle both defensively.
     const TwilioCtor = twilioModule?.Twilio || twilioModule?.default || twilioModule;
     _twilioClient = new TwilioCtor(accountSid, authToken);
     return _twilioClient;
}

export const createMessage = async (to: string, title: string, body: string, notificationType: NotificationTypeMap): Promise<any> => {

     const start = Date.now();

     try {
          if (!accountSid || !authToken || !numberFrom) {
               await logServerAction({
                    action: 'Twilio WhatsApp Send',
                    error: 'Missing Twilio env variables (TWILIO_ACCOUNT_SID / TWILIO_API_TOKEN / TWILIO_SENDER_PHONE_NUMBER)',
                    payload: null,
                    status: 'fail',
                    type: 'external',
                    user_id: null,
                    created_at: new Date(),
                    duration_ms: 0,
               });
               throw new Error('Twilio configuration missing');
          }
          const client = await getTwilioClient();
          if (!client) {
               throw new Error('Twilio client not initialized');
          }
          const normalize = (p: string) => {
               const cleaned = p.replace(/\s+/g, '');
               const numberPart = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
               if (!/^\d+$/.test(numberPart)) {
                    throw new Error('Invalid phone number: must contain only digits after "+"');
               }
               return `+${numberPart}`;
          };

          const toWa = `whatsapp:${normalize(to)}`;
          const fromEnv = process.env.TWILIO_SENDER_WHATSAPP_NUMBER || numberFrom || '';
          const fromWa = fromEnv.startsWith('whatsapp:') ? fromEnv : `whatsapp:${normalize(fromEnv)}`;


          let header = '';
          let messageBody = body;


          switch (notificationType.value) {
               case 'alert':
                    header = `🚨 *${notificationType.labelToken || 'ALERT'}*`;
                    messageBody = `*${body}*`;
                    break;
               case 'announcement':
                    header = `📢 *${notificationType.labelToken || 'Announcement'}*`;
                    break;
               case 'reminder':
                    header = `⏰ *${notificationType.labelToken || 'Reminder'}*`;
                    messageBody = `_${body}_`;
                    break;
               case 'message':
                    header = `💬 *${notificationType.labelToken || 'New Message'}*`;
                    messageBody = `_${body}_`;
                    break;
               case 'system':
                    header = `🛠️ *${notificationType.labelToken || 'System Update'}*`;
                    break;
               default:
                    header = `🔔 *${notificationType.labelToken || 'Notification'}*`;
          }

          const parts = [header, title, messageBody].filter(Boolean);
          const completeMessage = parts.join('\n\n');


          const waResponse = await client.messages.create({
               body: completeMessage,
               from: fromWa,
               to: toWa,
          });

          if (!waResponse || !(waResponse as any)?.sid) {
               logServerAction({
                    action: 'Twilio WhatsApp Send',
                    error: 'No message SID returned from Twilio',
                    payload: { to: toWa, body },
                    status: 'fail',
                    type: 'external',
                    user_id: null,
                    created_at: new Date(),
                    duration_ms: Date.now() - start,
               })
          }
          logServerAction({
               action: 'Twilio WhatsApp Send',
               error: '',
               payload: { to: toWa, body, sid: (waResponse as any)?.sid, status: (waResponse as any)?.status },
               status: 'success',
               type: 'external',
               user_id: null,
               created_at: new Date(),
               duration_ms: Date.now() - start,
          })
          return waResponse;
     } catch (e: any) {
          logServerAction({
               action: 'Twilio WhatsApp Send',
               error: e?.message || String(e),
               payload: { to, body },
               status: 'fail',
               type: 'external',
               user_id: null,
               created_at: new Date(),
               duration_ms: Date.now() - start,
          })
          throw e;
     }
}