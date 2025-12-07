import { tokens as serverTokens, getServerI18n } from 'src/locales/i18n-server';

interface BuildCalendarEventCreatedEmailParams {
     locale: string;
     eventId: string;
     title: string;
     description?: string | null;
     fullAddress?: string;
}

export const buildCalendarEventCreatedEmail = async ({
     locale,
     eventId,
     title,
     description,
     fullAddress,
}: BuildCalendarEventCreatedEmailParams) => {
     const t = await getServerI18n(locale || 'rs');

     const subject = t(serverTokens.email.calendarEventCreated.subject, { title });
     const intro = t(serverTokens.email.calendarEventCreated.intro);
     const descriptionLabel = t(serverTokens.email.common.descriptionLabel);
     const ctaLabel = t(serverTokens.email.calendarEventCreated.ctaLabel);

     const appBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
     const eventPath = `/dashboard/calendar/`;

     const injectedHtml = `
    <p>${intro}</p>
    <p><strong>${title}</strong></p>
    ${fullAddress ? `<p><strong>${t(serverTokens.common.address)}:</strong> ${fullAddress}</p>` : ''}
    ${description ? `<p><strong>${descriptionLabel}:</strong> ${description}</p>` : ''}
    <p>
      <a href="${appBaseUrl}${eventPath}">
        ${ctaLabel}
      </a>
    </p>
  `;

     return { subject, injectedHtml };
};
