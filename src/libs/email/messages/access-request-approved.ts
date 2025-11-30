type AccessRequestApprovedData = {
  name: string;
  email: string;
  password: string;
  loginUrl: string;
};

export const buildAccessRequestApprovedHtml = (data: AccessRequestApprovedData): string => {
  const safe = (val?: string | null) => (val || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const name = safe(data.name) || 'there';
  const email = safe(data.email);
  const password = safe(data.password);
  const loginUrl = safe(data.loginUrl);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Your Nest Link account is ready</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif; }
    .wrapper { width: 100%; background-color: #f4f4f4; padding: 20px; }
    .card { background: #ffffff; max-width: 640px; width: 100%; margin: 0 auto; border-radius: 10px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
    .header { text-align: center; padding: 28px 24px 12px; background: linear-gradient(135deg, #f68a00 0%, #f9b24a 100%); color: #1b1107; }
    .header h1 { margin: 0; font-size: 24px; }
    .body { padding: 24px; color: #333; }
    .cta { text-align: center; margin: 24px 0; }
    .btn { display: inline-block; padding: 12px 18px; border-radius: 6px; font-weight: 700; text-decoration: none; color: #fff; background-color: #f68a00; }
    .list { list-style: none; padding: 0; margin: 16px 0; }
    .list li { margin: 8px 0; }
    .footer { text-align: center; padding: 16px; font-size: 12px; color: #777; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>Your tenant access is approved</h1>
      </div>
      <div class="body">
        <p>Hi ${name},</p>
        <p>Your Nest Link tenant account has been created. Use the details below to sign in:</p>
        <ul class="list">
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Temporary password:</strong> <code>${password}</code></li>
        </ul>
        <div class="cta">
          <a class="btn" href="${loginUrl}" target="_blank" rel="noopener noreferrer">Go to login</a>
        </div>
        <p style="margin-top: 18px;">For security, please sign in and change your password right away.</p>
      </div>
      <div class="footer">
        Nest Link - Bringing Your Tenants Together
      </div>
    </div>
  </div>
</body>
</html>
`;
};
