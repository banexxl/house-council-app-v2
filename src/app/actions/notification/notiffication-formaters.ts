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
