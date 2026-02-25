import { tokens as serverTokens, getServerI18n } from 'src/locales/i18n-server';

interface BuildCalendarEventReminderEmailParams {
     locale: string;
     title: string;
     description?: string | null;
     startFormatted: string;
     minutesRemaining: number;
     calendarPath?: string;
}

export const buildCalendarEventReminderEmail = async ({
     locale,
     title,
     description,
     startFormatted,
     minutesRemaining,
     calendarPath = '/dashboard/calendar/',
}: BuildCalendarEventReminderEmailParams) => {
     const t = await getServerI18n(locale || 'rs');

     const subject = t(serverTokens.email.calendarEventReminder.subject, { title });
     const intro = t(serverTokens.email.calendarEventReminder.intro);
     const startsAt = t(serverTokens.email.calendarEventReminder.startsAt, { start: startFormatted });
     const timeRemaining = t(serverTokens.email.calendarEventReminder.timeRemaining, { minutes: minutesRemaining });
     const descriptionLabel = t(serverTokens.email.common.descriptionLabel);
     const ctaLabel = t(serverTokens.email.calendarEventReminder.ctaLabel);

     const appBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

     const injectedHtml = `
    <p>${intro}</p>
    <p><strong>${title}</strong></p>
    <p>${startsAt}</p>
    <p>${timeRemaining}</p>
    ${description ? `<p><strong>${descriptionLabel}:</strong> ${description}</p>` : ''}
    <p>
      <a href="${appBaseUrl}${calendarPath}">
        ${ctaLabel}
      </a>
    </p>
  `;

     return { subject, injectedHtml };
};
