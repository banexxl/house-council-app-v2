import twilio from "twilio";
import { logServerAction } from "../supabase/server-logging";
import { NotificationType, NotificationTypeMap } from "src/types/notification";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_API_TOKEN;
const numberFrom = process.env.TWILIO_SENDER_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

export const createMessage = async (to: string, title: string, body: string, notificationType: NotificationTypeMap): Promise<any> => {

     const start = Date.now();

     try {
          if (!accountSid || !authToken || !numberFrom) {
               logServerAction({
                    action: 'Twilio WhatsApp Send',
                    error: 'Missing Twilio WhatsApp env variables',
                    payload: null,
                    status: 'fail',
                    type: 'external',
                    user_id: null,
                    created_at: new Date(),
                    duration_ms: 0,
               })
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