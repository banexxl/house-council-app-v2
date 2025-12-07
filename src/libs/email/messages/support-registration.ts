import { getServerI18n, tokens as serverTokens } from 'src/locales/i18n-server';

export const buildSuccessfulRegistrationEmail = async (
  locale: string,
  clientEmail: string,
  contactPerson: string
): Promise<{ subject: string; injectedHtml: string }> => {
  const t = await getServerI18n(locale || 'rs');

  const subject =
    t(serverTokens.email.supportRegistrationSuccessTitle) ||
    'Client registered successfully';

  const injectedHtml = `
          <p>${t(serverTokens.email.supportRegistrationSuccessIntro) || 'A new client has been registered.'}</p>
          <p><strong>${t(serverTokens.email.supportRegistrationClientNameLabel) || 'Client Name'}:</strong> ${contactPerson}</p>
          <p><strong>${t(serverTokens.email.supportRegistrationClientEmailLabel) || 'Client Email'}:</strong> ${clientEmail}</p>
     `;

  return { subject, injectedHtml };
};

export const buildClientContactMessageEmail = async (
  locale: string,
  clientEmail: string,
  contactPerson: string,
  message: string
): Promise<{ subject: string; injectedHtml: string }> => {
  const t = await getServerI18n(locale || 'rs');

  const subject =
    t(serverTokens.email.supportContactMessageTitle) ||
    'Client contact message';

  const injectedHtml = `
          <p>${t(serverTokens.email.supportContactMessageIntro) || 'You have received a new contact message from a client.'}</p>
          <p><strong>${t(serverTokens.email.supportRegistrationClientNameLabel) || 'Client Name'}:</strong> ${contactPerson}</p>
          <p><strong>${t(serverTokens.email.supportRegistrationClientEmailLabel) || 'Client Email'}:</strong> ${clientEmail}</p>
          <p><strong>${t(serverTokens.email.supportContactMessageLabel) || 'Message'}:</strong> ${message}</p>
     `;

  return { subject, injectedHtml };
};
