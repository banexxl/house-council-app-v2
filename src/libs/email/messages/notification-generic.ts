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
  <style>
    body { margin: 0; padding: 0; background-color: #f68a00; }
    table { border-spacing: 0; font-family: Arial, sans-serif; }
    img { display: block; max-width: 100%; height: auto; }
    .wrapper { width: 100%; background-color: #f68a00; padding: 20px; }
    .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 800px; border-radius: 10px; }
    .column td { padding: 10px; vertical-align: top; text-align: center; }
    .footer { background-color: #4a1005; color: white; font-weight: bold; font-size: 16px; padding: 15px; border-radius: 0 0 10px 10px; display: flex; justify-content: center; align-items: center; gap: 20px; }
    .stars { color: gold; font-size: 20px; }
    a { color: #f68a00; font-weight: bold; text-decoration: none; }
    @media screen and (max-width: 600px) {
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; }
      .footer { flex-direction: column !important; text-align: center !important; }
    }
  </style>
  </head>
  <body>
    <center class="wrapper">
      <table role="presentation" class="main">
        <tr>
          <td style="padding: 40px 20px; text-align: center;">
            <h1 style="font-size: 32px; font-weight: 600; margin: 0;">${heading}</h1>
            ${subheading ? `<h2 style="font-size: 18px; margin: 10px 0 20px; font-weight: 400;">${subheading}</h2>` : ''}

            <div style="text-align: left; font-size: 14px; line-height: 1.6; margin-top: 10px;">
              ${injectedHtml}
            </div>

            <table role="presentation" width="100%" style="margin-top: 40px;">
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

            <table role="presentation" width="100%" style="margin-top: 30px; background-color: #4a1005; border-radius: 0 0 10px 10px;">
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
