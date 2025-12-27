import { getServerI18n, tokens as serverTokens } from 'src/locales/i18n-server';

type AccessRequestApprovedData = {
  locale: string;
  name: string;
  email: string;
  password: string;
  loginUrl: string;
};

export const buildAccessRequestApprovedEmail = async (
  data: AccessRequestApprovedData
): Promise<{ subject: string; injectedHtml: string }> => {
  const t = await getServerI18n(data.locale || 'rs');

  const safe = (val?: string | null) => (val || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const name = safe(data.name) || t(serverTokens.email.accessApprovedGreetingFallback) || 'there';
  const email = safe(data.email);
  const password = safe(data.password);
  const loginUrl = safe(data.loginUrl);

  const subject =
    t(serverTokens.email.accessApprovedTitle) ||
    'Your Nest Link account is ready';

  const intro =
    t(serverTokens.email.accessApprovedIntro) ||
    'Your Nest Link tenant account has been created. Use the details below to sign in:';

  const emailLabel =
    t(serverTokens.email.accessApprovedEmailLabel) ||
    'Email';

  const passwordLabel =
    t(serverTokens.email.accessApprovedPasswordLabel) ||
    'Temporary password';

  const ctaLabel =
    t(serverTokens.email.accessApprovedCta) ||
    'Go to login';

  const securityNote =
    t(serverTokens.email.accessApprovedSecurityNote) ||
    'For security, please sign in and change your password right away.';

  const injectedHtml = `
      <p>${t(serverTokens.email.accessApprovedGreeting, { name }) || `Hi ${name},`}</p>
      <p>${intro}</p>
      <ul>
        <li><strong>${emailLabel}:</strong> ${email}</li>
        <li><strong>${passwordLabel}:</strong> <code>${password}</code></li>
      </ul>
      <p>
        <a href="${loginUrl}" target="_blank" rel="noopener noreferrer">
          ${ctaLabel}
        </a>
      </p>
      <p>${securityNote}</p>
    `;

  return { subject, injectedHtml };
};

export const buildAccessDeniedEmail = async (
  data: { locale: string; name: string; email: string; contactSupportUrl: string }
): Promise<{ subject: string; injectedHtml: string }> => {
  const t = await getServerI18n(data.locale || 'rs');

  const safe = (val?: string | null) => (val || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const name = safe(data.name) || t(serverTokens.email.accessDeniedGreetingFallback) || 'there';
  const contactSupportUrl = safe(data.contactSupportUrl);

  const subject =
    t(serverTokens.email.accessDeniedTitle) ||
    'Your Nest Link access request has been denied';

  const injectedHtml = `
      <p>${t(serverTokens.email.accessDeniedGreeting, { name }) || `Hi ${name},`}</p>
      <p>${t(serverTokens.email.accessDeniedBody) || 'Your access request has been denied. If you believe this is a mistake, please contact support.'}</p>
      <p><a href="${contactSupportUrl}">${t(serverTokens.email.accessDeniedContactSupportLinkText) || 'Contact Support'}</a></p>
    `;

  return { subject, injectedHtml };
}
