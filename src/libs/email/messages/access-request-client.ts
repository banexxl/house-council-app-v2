import { getServerI18n, tokens as serverTokens } from 'src/locales/i18n-server';

type AccessRequestEmailData = {
  locale: string;
  name: string;
  email: string;
  message?: string;
  building?: string | null;
  apartment?: string | null;
  approveLink: string;
  rejectLink: string;
};

export const buildAccessRequestClientEmail = async (
  data: AccessRequestEmailData
): Promise<{ subject: string; injectedHtml: string }> => {
  const t = await getServerI18n(data.locale || 'rs');
  const safe = (val?: string | null) => (val || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const subject =
    t(serverTokens.email.accessRequestTitle) ||
    'New Access Request';

  const intro =
    t(serverTokens.email.accessRequestIntro) ||
    'You received a new access request from a tenant prospect.';

  const rows = [
    { label: t(serverTokens.email.accessRequestNameLabel) || 'Name', value: safe(data.name) },
    { label: t(serverTokens.email.accessRequestEmailLabel) || 'Email', value: safe(data.email) },
    { label: t(serverTokens.email.accessRequestBuildingLabel) || 'Building', value: data.building ? safe(data.building) : '-' },
    { label: t(serverTokens.email.accessRequestApartmentLabel) || 'Apartment', value: data.apartment ? safe(data.apartment) : '-' },
    { label: t(serverTokens.email.accessRequestMessageLabel) || 'Message', value: data.message ? safe(data.message) : '-' },
  ];

  const approveLabel =
    t(serverTokens.email.accessRequestApproveCta) ||
    'Approve & Provision';

  const rejectLabel =
    t(serverTokens.email.accessRequestRejectCta) ||
    'Reject';

  const injectedHtml = `
      <p>${intro}</p>
      <table style="width:100%; border-collapse:collapse; margin-top:12px;">
        <tbody>
          ${rows
      .map(
        (r) => `
              <tr>
                <td style="padding:6px 4px; font-weight:600;">${r.label}:</td>
                <td style="padding:6px 4px; text-align:right;">${r.value}</td>
              </tr>`
      )
      .join('')}
        </tbody>
      </table>
      <p style="margin-top:18px; text-align:center;">
        <a href="${data.approveLink}" target="_blank" style="display:inline-block; padding:10px 16px; margin-right:8px; background-color:#f68a00; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:700;">
          ${approveLabel}
        </a>
        <a href="${data.rejectLink}" target="_blank" style="display:inline-block; padding:10px 16px; background-color:#4a1005; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:700;">
          ${rejectLabel}
        </a>
      </p>
    `;

  return { subject, injectedHtml };
};
