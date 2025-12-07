import { tokens as serverTokens, getServerI18n } from 'src/locales/i18n-server';

interface BuildIncidentCreatedEmailParams {
     locale: string;
     incidentId: string;
     title: string;
     description?: string | null;
     fullAddress?: string;
     apartmentNumber?: string | null;
}

export const buildIncidentCreatedEmail = async ({
     locale,
     incidentId,
     title,
     description,
     fullAddress,
     apartmentNumber,
}: BuildIncidentCreatedEmailParams): Promise<{ subject: string; injectedHtml: string }> => {
     const t = await getServerI18n(locale || 'rs');

     const subject =
          t(serverTokens.email.incidentCreatedTitle) ||
          'New service request created';

     const intro =
          t(serverTokens.email.incidentCreatedBodyIntro) ||
          'A new service request has been created for your building.';

     const descriptionLabel =
          t(serverTokens.email.incidentCreatedBodyDescriptionLabel) ||
          'Request details';

     const ctaLabel =
          t(serverTokens.email.incidentCreatedBodyCta) ||
          'View request';

     const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
     const incidentPath = `/dashboard/service-requests/${incidentId}`;

     const injectedHtml = `
      <p>${intro}</p>
      <p><strong>${title}</strong></p>
      ${fullAddress ? `<p><strong>${t(serverTokens.common.address)}:</strong> ${fullAddress}${apartmentNumber ? `, apt ${apartmentNumber}` : ''}</p>` : ''}
      ${description ? `<p><strong>${descriptionLabel}:</strong> ${description}</p>` : ''}
      <p>
        <a href="${appBaseUrl}${incidentPath}">
          ${ctaLabel}
        </a>
      </p>
    `;

     return { subject, injectedHtml };
};
