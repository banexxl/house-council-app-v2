type AccessRequestEmailData = {
  name: string;
  email: string;
  message?: string;
  building?: string | null;
  apartment?: string | null;
  approveLink: string;
  rejectLink: string;
};

export const buildAccessRequestClientHtml = (data: AccessRequestEmailData): string => {
  const safe = (val?: string | null) => (val || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rows = [
    { label: 'Name: ', value: safe(data.name) },
    { label: 'Email: ', value: safe(data.email) },
    { label: 'Building: ', value: data.building ? safe(data.building) : '-' },
    { label: 'Apartment: ', value: data.apartment ? safe(data.apartment) : '-' },
    { label: 'Message: ', value: data.message ? safe(data.message) : '-' },
  ];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>New Access Request</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f68a00; }
    table { border-spacing: 0; font-family: Arial, sans-serif; }
    .wrapper { width: 100%; background-color: #f68a00; padding: 20px; }
    .card { background: #ffffff; max-width: 800px; width: 100%; margin: 0 auto; border-radius: 10px; overflow: hidden; }
    .header { text-align: center; padding: 32px 24px 16px; }
    .header h1 { margin: 0; font-size: 28px; color: #4a1005; }
    .header p { margin: 8px 0 0; color: #555; }
    .body { padding: 0 24px 32px; }
    .row { padding: 10px 0; border-bottom: 1px solid #f2f2f2; display: flex; justify-content: space-between; gap: 12px; }
    .row:last-child { border-bottom: none; }
    .label { font-weight: 700; color: #4a1005; }
    .value { color: #333; text-align: right; }
    .cta { text-align: center; margin-top: 24px; }
    .btn { display: inline-block; padding: 12px 18px; border-radius: 6px; font-weight: 700; text-decoration: none; color: #fff; margin: 0 6px; }
    .btn-approve { background-color: #f68a00; }
    .btn-reject { background-color: #4a1005; }
    .footer { background-color: #4a1005; color: #ffffff; font-weight: bold; font-size: 16px; padding: 14px; text-align: center; }
    @media screen and (max-width: 600px) {
      .row { flex-direction: column; align-items: flex-start; }
      .value { text-align: left; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>New Access Request</h1>
        <p>You received a new access request from a tenant prospect.</p>
      </div>
      <div class="body">
        ${rows
      .map(
        (r) => `
            <div class="row">
              <div class="label">${r.label}</div>
              <div class="value">${r.value}</div>
            </div>`
      )
      .join('')}
        <div class="cta">
          <a href="${data.approveLink}"
                target="_blank"
                style="
                display:inline-block;
                padding:12px 18px;
                background-color:#f68a00;
                color:#ffffff;
                text-decoration:none;
                border-radius:6px;
                font-weight:700;
                cursor:pointer;
            ">
                Approve &amp; Provision
          </a>
          <a href="${data.rejectLink}"
                target="_blank"
                style="
                display:inline-block;
                padding:12px 18px;
                background-color:#4a1005;
                color:#ffffff;
                text-decoration:none;
                border-radius:6px;
                font-weight:700;
                cursor:pointer;
                margin-left:12px;
            ">
                Reject
            </a>
        </div>
      </div>
      <div class="footer">Nest Link - Bringing Your Tenants Together</div>
    </div>
  </div>
</body>
</html>
`;
};
