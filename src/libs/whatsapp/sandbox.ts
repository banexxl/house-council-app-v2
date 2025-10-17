// src/lib/whatsapp-sandbox.ts
export const buildWhatsAppSandboxJoinLink = (
     sandboxNumber: string,
     keyword: string
) => {
     // wa.me requires phone without '+'
     const phone = sandboxNumber.replace(/\+/g, '');
     const text = encodeURIComponent(`join ${keyword}`);
     return `https://wa.me/${phone}?text=${text}`;
}