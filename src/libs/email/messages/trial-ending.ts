import { getServerI18n, tokens as serverTokens } from 'src/locales/i18n-server';

export const buildTrialEndingEmail = async (
  locale: string,
  daysRemaining: number
): Promise<{ subject: string; injectedHtml: string }> => {
  const t = await getServerI18n(locale || 'rs');

  const subject =
    t(serverTokens.email.trialEndingTitle, { daysRemaining }) ||
    'Your trial is ending soon';

  const intro =
    t(serverTokens.email.trialEndingIntro, { daysRemaining }) ||
    `You have ${daysRemaining} days left in your free trial. Make the most of it!`;

  const details =
    t(serverTokens.email.trialEndingDetails) ||
    'After your trial ends, you will still have access to your account, but some features may be limited unless you upgrade to a paid plan.';

  const injectedHtml = `
          <p>${intro}</p>
          <p>${details}</p>
     `;

  return { subject, injectedHtml };
};
