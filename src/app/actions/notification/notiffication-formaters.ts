// notifications/formatters.ts

import { Notification, NotificationTypeMap, NotificationChannel } from "src/types/notification";
import { htmlToPlainText } from "src/utils/html-tags-remover";


const emojiByType: Record<Notification['type']['value'], string> = {
     system: '🛠️',
     message: '💬',
     reminder: '⏰',
     alert: '🚨',
     announcement: '📢',
     other: '🔔',
     all: '🔔',
};

export function formatWhatsApp(
     items: Notification[]
): { title: string; body: string; dominantType: NotificationTypeMap } {
     const dominantType = items[0].type;
     if (items.length === 1) {
          const n = items[0];
          const emoji = emojiByType[n.type.value] ?? '🔔';
          const header = `${emoji} *${n.type.labelToken || 'Notification'}*`;
          const title = n.title;
          const body = htmlToPlainText(n.description);
          const bodyStyled =
               n.type.value === 'alert' ? `*${body}*` :
                    n.type.value === 'reminder' || n.type.value === 'message' ? `_${body}_` :
                         body;

          return {
               title,
               body: [header, title, bodyStyled].filter(Boolean).join('\n\n'),
               dominantType,
          };
     }

     // Digest (multiple)
     const header = `🔔 *${items.length} new notifications*`;
     const lines = items.map(n => {
          const emoji = emojiByType[n.type.value] ?? '•';
          const content = htmlToPlainText(n.description).trim();
          return `${emoji} *${n.title}*\n${content}`;
     });

     return {
          title: `${items.length} new notifications`,
          body: [header, lines.join('\n\n')].join('\n\n'),
          dominantType,
     };
}

export function formatEmail(
     items: Notification[]
): { subject: string; html: string; dominantType: NotificationTypeMap } {
     const dominantType = items[0].type;

     if (items.length === 1) {
          const n = items[0];
          const subject = `[${n.type.value.toUpperCase()}] ${n.title}`;
          const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif">
        <h2>${n.title}</h2>
        <p style="opacity:.7;margin:.25rem 0">${n.type.labelToken}</p>
        <div>${n.description}</div>
      </div>
    `.trim();
          return { subject, html, dominantType };
     }

     const subject = `${items.length} new notifications`;
     const htmlItems = items.map(n => `
    <li style="margin-bottom:12px">
      <div style="font-weight:600">${n.title}</div>
      <div style="font-size:14px;opacity:.8">${n.type.labelToken}</div>
      <div>${n.description}</div>
    </li>`).join('');

     const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif">
      <h2>${subject}</h2>
      <ul style="padding-left:18px">${htmlItems}</ul>
    </div>
  `.trim();

     return { subject, html, dominantType };
}
