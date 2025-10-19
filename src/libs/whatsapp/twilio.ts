"use server";
import { logServerAction } from "../supabase/server-logging";
import { NotificationTypeMap } from "src/types/notification";
import log from "src/utils/logger";

// NOTE: Removed top-level twilio import to avoid loading heavy library eagerly.
// We'll dynamic-import only when actually sending a message.

// We lazy-load the library so Next.js / Vercel won't attempt to resolve the
// internal twilio ../lib path in an unsupported runtime.
let _twilioClient: any | null = null;

// Helper to safely read credentials (server-side only). We alias TWILIO_AUTH_TOKEN -> TWILIO_AUTH_TOKEN usage if needed.
function getTwilioEnv() {
     const accountSid = process.env.TWILIO_ACCOUNT_SID!
     const authToken = process.env.TWILIO_AUTH_TOKEN!
     const apiTokenSID = process.env.TWILIO_API_KEY_SID!
     const apiTokenSecret = process.env.TWILIO_API_KEY_SECRET!
     const whatsappFrom = process.env.TWILIO_SENDER_WHATSAPP_NUMBER!
     const smsFrom = process.env.TWILIO_SENDER_PHONE_NUMBER!
     return { accountSid, authToken, whatsappFrom, smsFrom, apiTokenSID, apiTokenSecret };
}

// Mask secrets when logging (show first 4 chars only if present).
const mask = (s: string) => (s ? `${s.slice(0, 4)}***` : "n/a");

async function getTwilioClient() {
     if (_twilioClient) return _twilioClient;
     const { accountSid, authToken } = getTwilioEnv();
     if (!accountSid || !authToken) return null;
     log(`Twilio: initializing client (sid=${mask(accountSid)} token=${mask(authToken)})`);
     const twilioModule: any = await import("twilio");
     const TwilioCtor = twilioModule?.Twilio || twilioModule?.default || twilioModule;
     _twilioClient = new TwilioCtor(accountSid, authToken);
     return _twilioClient;
}

// Optional lightweight fetch-based sender (avoids full twilio lib). Useful for edge runtimes.
async function sendViaFetch(params: { to: string; from: string; body: string }) {
     const { apiTokenSID, apiTokenSecret } = getTwilioEnv();
     if (!apiTokenSID || !apiTokenSecret) throw new Error("Twilio credentials missing for fetch sender");
     log(`Twilio fetch sender: to=${params.to} from=${params.from}, apiTokenSID=${(apiTokenSID)}, apiTokenSecret=${(apiTokenSecret)}`);
     const url = `https://api.twilio.com/2010-04-01/Accounts/${apiTokenSID}/Messages.json`;
     const form = new URLSearchParams({ To: params.to, From: params.from, Body: params.body });
     const res = await fetch(url, {
          method: "POST",
          headers: {
               Authorization: "Basic " + Buffer.from(`${apiTokenSID}:${apiTokenSecret}`).toString("base64"),
               "Content-Type": "application/x-www-form-urlencoded",
          },
          body: form.toString(),
     });
     const response = await res.clone().text();
     log(`Twilio fetch send response: status=${response}`);
     if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Twilio fetch send failed status=${res.status} body=${txt}`);
     }
     return res.json();
}

export const createMessage = async (
     to: string,
     title: string,
     body: string,
     notificationType: NotificationTypeMap,
     opts: { useFetch?: boolean } = {}
): Promise<any> => {
     const start = Date.now();
     const { accountSid, authToken, whatsappFrom } = getTwilioEnv();
     if (!accountSid || !authToken || !whatsappFrom) {
          await logServerAction({
               action: "Twilio WhatsApp Send",
               error: "Missing Twilio env variables (ACCOUNT_SID / AUTH_TOKEN / SENDER_WHATSAPP_NUMBER)",
               payload: null,
               status: "fail",
               type: "external",
               user_id: null,
               created_at: new Date(),
               duration_ms: 0,
          });
          throw new Error("Twilio configuration missing");
     }
     const normalize = (p: string) => {
          const cleaned = p.replace(/\s+/g, "");
          const numberPart = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
          if (!/^\d+$/.test(numberPart)) throw new Error("Invalid phone number: digits only after '+'");
          return `+${numberPart}`;
     };
     const toWa = `whatsapp:${normalize(to)}`;
     let header = "";
     let messageBody = body;
     switch (notificationType.value) {
          case "alert":
               header = `🚨 *${notificationType.labelToken || "ALERT"}*`;
               messageBody = `*${body}*`;
               break;
          case "announcement":
               header = `📢 *${notificationType.labelToken || "Announcement"}*`;
               break;
          case "reminder":
               header = `⏰ *${notificationType.labelToken || "Reminder"}*`;
               messageBody = `_${body}_`;
               break;
          case "message":
               header = `💬 *${notificationType.labelToken || "New Message"}*`;
               messageBody = `_${body}_`;
               break;
          case "system":
               header = `🛠️ *${notificationType.labelToken || "System Update"}*`;
               break;
          default:
               header = `🔔 *${notificationType.labelToken || "Notification"}*`;
     }
     const parts = [header, title, messageBody].filter(Boolean);
     const completeMessage = parts.join("\n\n");
     try {
          let waResponse: any;
          if (opts.useFetch) {
               waResponse = await sendViaFetch({ to: toWa, from: whatsappFrom, body: completeMessage });
          } else {
               const client = await getTwilioClient();
               if (!client) throw new Error("Twilio client not initialized");
               waResponse = await client.messages.create({ body: completeMessage, from: whatsappFrom, to: toWa });
          }
          log(`Twilio WhatsApp response: sid=${waResponse?.sid || "n/a"} status=${waResponse?.status || waResponse?.statusCode || "n/a"}`);
          if (!waResponse?.sid) {
               await logServerAction({
                    action: "Twilio WhatsApp Send",
                    error: "No message SID returned from Twilio",
                    payload: { to: toWa },
                    status: "fail",
                    type: "external",
                    user_id: null,
                    created_at: new Date(),
                    duration_ms: Date.now() - start,
               });
          } else {
               await logServerAction({
                    action: "Twilio WhatsApp Send",
                    error: "",
                    payload: { to: toWa, sid: waResponse.sid, status: waResponse.status },
                    status: "success",
                    type: "external",
                    user_id: null,
                    created_at: new Date(),
                    duration_ms: Date.now() - start,
               });
          }
          return waResponse;
     } catch (e: any) {
          await logServerAction({
               action: "Twilio WhatsApp Send",
               error: e?.message || String(e),
               payload: { to: toWa },
               status: "fail",
               type: "external",
               user_id: null,
               created_at: new Date(),
               duration_ms: Date.now() - start,
          });
          throw e;
     }
};

// Invite to whatsapp sandbox
type InviteArgs = {
     phone: string;     // E.164 format, e.g. +3816xxxxxxx
     name?: string;
};

function buildJoinLinks(sandboxNumber: string, keyword: string) {
     // WhatsApp wants the number in intl format WITHOUT '+'
     const intl = sandboxNumber.replace(/[^\d]/g, ''); // keep digits only
     const text = encodeURIComponent(`join ${keyword}`);

     // Primary (more compatible in some environments)
     const api = `https://api.whatsapp.com/send?phone=${intl}&text=${text}`;
     // Fallback (official universal link)
     const wa = `https://wa.me/${intl}?text=${text}`;

     return { api, wa };
}

export async function sendWhatsAppSandboxInvite({ phone, name }: InviteArgs) {
     // if (!phone?.startsWith("+")) return { ok: false, error: "Phone must be E.164 format (e.g., +16...)" };
     const { accountSid, authToken, smsFrom, whatsappFrom } = getTwilioEnv();
     const keyword = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_SANDBOX_KEYWORD || "";
     log(`Twilio invite: sid=${(accountSid)}, auth=${authToken}, smsFrom=${smsFrom} waFrom=${whatsappFrom} keyword=${keyword}`);
     if (!accountSid || !authToken || !smsFrom || !whatsappFrom || !keyword) return { ok: false, error: "Missing Twilio configuration." };
     const { api, wa } = buildJoinLinks(whatsappFrom, keyword);
     const body =
          `Hi${name ? " " + name : ""}!\n` +
          `To receive WhatsApp messages and updates for your building, join our group:\n` +
          `1) Link: ${api}\n` +
          `   (If it doesn’t prefill, try: ${wa})\n` +
          `OR\n` +
          `2) Send: join ${keyword} to ${whatsappFrom} in WhatsApp.`;
     try {
          // Use fetch variant to avoid separate client init.
          const sms = await sendViaFetch({ to: '+' + phone, from: smsFrom, body });
          return { ok: true, sid: sms.sid || sms?.sid || "" };
     } catch (e: any) {
          return { ok: false, error: e?.message || "Failed to send SMS" };
     }
}