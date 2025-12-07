import { tokens as serverTokens, getServerI18n } from 'src/locales/i18n-server';

interface BuildPollPublishedEmailParams {
     locale: string;
     pollId: string;
     title: string;
     description?: string | null;
     fullAddress?: string;
}

export const buildPollPublishedEmail = async ({
     locale,
     pollId,
     title,
     description,
     fullAddress,
}: BuildPollPublishedEmailParams): Promise<{ subject: string; injectedHtml: string }> => {
     const t = await getServerI18n(locale || 'rs');

     const subject =
          t(serverTokens.email.pollPublishedTitle) ||
          'New poll has been published';

     const intro =
          t(serverTokens.email.pollPublishedBodyIntro) ||
          'A new poll has been published for your building.';

     const descriptionLabel =
          t(serverTokens.email.pollPublishedBodyDescriptionLabel) ||
          'Poll description';

     const ctaLabel =
          t(serverTokens.email.pollPublishedBodyCta) ||
          'View and vote in the poll';

     const appBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
     const pollPath = `/dashboard/polls/voting`;

     const injectedHtml = `
                                                            <p>${intro}</p>
                                                            <p><strong>${title}</strong></p>
                                                            ${fullAddress ? `<p><strong>${t(serverTokens.common.address)}:</strong> ${fullAddress}</p>` : ''}
                                                            ${description ? `<p><strong>${descriptionLabel}:</strong> ${description}</p>` : ''}
                                                            <p>
                                                                <a href="${appBaseUrl}${pollPath}">
                                                                    ${ctaLabel}
                                                                </a>
                                                            </p>
                                                        `;

     return { subject, injectedHtml };
};
