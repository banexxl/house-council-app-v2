import { getServerI18n, tokens as serverTokens } from 'src/locales/i18n-server';

export const buildSubscriptionEndingSupportEmail = async (
  locale: string,
  planName: string | undefined,
  clientEmail: string,
  daysRemaining: number
): Promise<{ subject: string; injectedHtml: string }> => {
  const t = await getServerI18n(locale || 'rs');

  const subject =
    t(serverTokens.email.subscriptionEndingSupportTitle, { planName: planName ?? '' }) ||
    `Subscription ${planName ?? ''} ending soon`;

  const intro =
    t(serverTokens.email.subscriptionEndingSupportIntro, { clientEmail }) ||
    `The subscription for client ${clientEmail} is about to end.`;

  const details =
    t(serverTokens.email.subscriptionEndingSupportDetails, { daysRemaining }) ||
    `The subscription for the client above is about to end in ${daysRemaining} days. Make sure to follow up with them.`;

  const injectedHtml = `
          <p>${intro}</p>
          <p>${details}</p>
     `;

  return { subject, injectedHtml };
};
