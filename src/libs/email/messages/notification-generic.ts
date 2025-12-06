export const buildNotificationGenericHtml = (
  injectedHtml: string,
  heading: string = 'Notification',
  subheading: string = ''
): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${heading}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    body { margin: 0; padding: 0; background: linear-gradient(135deg, #ffe3a3, #f68a00); color: #1f2d3d; }
    table { border-spacing: 0; font-family: 'Inter', 'Segoe UI', Tahoma, sans-serif; color: inherit; }
    img { display: block; max-width: 100%; height: auto; }
    .wrapper { width: 100%; padding: 30px 16px; }
    .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 800px; border-radius: 14px; overflow: hidden; box-shadow: 0 16px 45px rgba(0, 0, 0, 0.08); }
    .hero { background: linear-gradient(135deg, #ffb347, #f68a00); color: #ffffff; padding: 32px 30px 26px; text-align: left; }
    .hero .eyebrow { margin: 0 0 8px; letter-spacing: 0.08em; font-size: 12px; text-transform: uppercase; opacity: 0.9; }
    .hero h1 { font-size: 30px; font-weight: 700; margin: 0; }
    .hero h2 { font-size: 18px; font-weight: 500; margin: 10px 0 0; opacity: 0.95; }
    .content { padding: 26px 30px 10px; text-align: center; }
    .body-copy { text-align: left; font-size: 15px; line-height: 1.7; margin-top: 12px; color: #2b3a4a; }
    .column td { padding: 10px; vertical-align: top; text-align: center; }
    .footer { background-color: #4a1005; color: white; font-weight: bold; font-size: 16px; padding: 15px; border-radius: 0 0 10px 10px; display: flex; justify-content: center; align-items: center; gap: 20px; }
    .stars { color: gold; font-size: 20px; }
    a { color: #f68a00; font-weight: 600; text-decoration: none; }
    @media screen and (max-width: 600px) {
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; }
      .footer { flex-direction: column !important; text-align: center !important; }
      .hero, .content { padding: 22px 18px; }
    }
  </style>
  </head>
  <body>
    <center class="wrapper">
      <table role="presentation" class="main">
        <tr>
          <td style="padding: 0;">
            <div class="hero">
              <p class="eyebrow">Nest Link</p>
              <h1>${heading}</h1>
              ${subheading ? `<h2>${subheading}</h2>` : ''}
            </div>

            <div class="content">
              <div class="body-copy">
                ${injectedHtml}
              </div>

              <table role="presentation" width="100%" style="margin-top: 32px;">
                <tr>
                  <td class="stack-column" width="33.33%">
                    <table role="presentation" width="100%">
                      <tr>
                        <td>
                          <h3 style="font-style: italic; font-weight: bold;">Thank you for choosing us!</h3>
                          <p style="font-size: 14px;">We appreciate your trust and support!</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td class="stack-column" width="33.33%">
                    <table role="presentation" width="100%">
                      <tr>
                        <td>
                          <img src="https://house-council-app.s3.eu-central-1.amazonaws.com/emails/JPG/1-01.jpg" alt="Nest Link Logo" width="80" style="margin: 0 auto 10px;" />
                          <p style="margin: 0;"><strong>NEST LINK</strong></p>
                          <small>Bringing Your Tenants Together</small>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td class="stack-column" width="33.33%">
                    <table role="presentation" width="100%">
                      <tr>
                        <td align="center">
                          <h3 style="font-style: italic; font-weight: bold; margin-bottom: 8px;">Contact</h3>
                          <table role="presentation" style="margin: 0 auto;">
                            <tr>
                                <td style="padding: 0 5px; font-size: 18px;">📞</td>
                                <td style="padding: 0 5px; font-size: 18px;">✉️</td>
                                <td style="padding: 0 5px; font-size: 18px;">🌐</td>
                            </tr>
                          </table>
                          <p style="font-size: 14px; margin: 10px 0 0;">
                            +38166415651<br />
                            support@nest-link.app<br />
                            nest-link.app
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>

            <table role="presentation" width="100%" style="margin-top: 20px; background: linear-gradient(135deg, #4a1005, #761a0a); border-radius: 0 0 14px 14px;">
              <tr>
                <td align="center" style="padding: 15px;">
                  <table role="presentation" style="margin: 0 auto;">
                    <tr>
                      <td style="color: #ffffff; font-weight: bold; font-size: 16px; text-align: center;">
                        If you loved your order, we would love to have your review!
                      </td>
                      <td style="padding-left: 10px;">
                        <span style="color: gold; font-size: 18px; line-height: 1;">★★★★★</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </center>
  </body>
  </html>
`;
