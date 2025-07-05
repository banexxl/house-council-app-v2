'use server';

import nodemailer, { SentMessageInfo } from 'nodemailer';
import { logServerAction } from '../supabase/server-logging';
import { readClientSubscriptionPlanFromClientId } from 'src/app/dashboard/subscriptions/subscription-plan-actions';


const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER, // generated ethereal user
    pass: process.env.EMAIL_SERVER_PASSWORD, // generated ethereal password
  },
  tls: {
    rejectUnauthorized: false
  }
});

type SendEndingSubscriptionEmail = {
  daysRemaining: number,
  clientEmail: string,
  clientId: string
}

interface SendTrialEndingEmail {
  to: string;
  daysRemaining: number;
}

export const sendTrialEndingEmailToClient = async ({ to, daysRemaining }: SendTrialEndingEmail): Promise<SentMessageInfo> => {

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Thank You Email</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f68a00;
    }
    table {
      border-spacing: 0;
      font-family: Arial, sans-serif;
    }
    img {
      display: block;
      max-width: 100%;
      height: auto;
    }
    .wrapper {
      width: 100%;
      background-color: #f68a00;
      padding: 20px;
    }
    .main {
      background-color: #ffffff;
      margin: 0 auto;
      width: 100%;
      max-width: 800px;
      border-radius: 10px;
    }
    .column td {
      padding: 10px;
      vertical-align: top;
      text-align: center;
    }
    .footer {
      background-color: #4a1005;
      color: white;
      font-weight: bold;
      font-size: 16px;
      padding: 15px;
      border-radius: 0 0 10px 10px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
    }
    .stars {
      color: gold;
      font-size: 20px;
    }
    a {
      color: #f68a00;
      font-weight: bold;
      text-decoration: none;
    }

    @media screen and (max-width: 600px) {
      .stack-column {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      .footer {
        flex-direction: column !important;
        text-align: center !important;
      }
    }
  </style>
</head>
<body>
  <center class="wrapper">
    <table role="presentation" class="main">
      <tr>
        <td style="padding: 40px 20px; text-align: center;">
          <h1 style="font-size: 48px; font-weight: 300; margin: 0;">Thank You</h1>
          <h2 style="font-size: 24px; margin: 10px 0 20px;">FOR CHOOSING US!</h2>

          <p style="font-size: 16px; margin-top: 20px;">
            You have <strong>${daysRemaining}</strong> days left in your free trial. Make the most of it!
          </p>

          <p style="font-size: 14px; color: #666;">
            After your trial ends, you’ll still have access to your account, but some features may be limited unless you upgrade to a paid plan.
          </p>

          <table role="presentation" width="100%" style="margin-top: 40px;">
            <tr>
              <td class="stack-column" width="33.33%">
                <table role="presentation" width="100%">
                  <tr>
                    <td>
                      <h3 style="font-style: italic; font-weight: bold;">A heartfelt thank you</h3>
                      <p style="font-size: 14px;">We truly appreciate your trust and support—it means the world to us.</p>
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

  const sendEmailToClientResponse = await transporter.sendMail({
    from: 'Nest Link <no-reply@nest-link.app>',
    to,
    subject: 'Your free tial is about to end, how do you like it so far?',
    html: htmlContent
  });

  if (sendEmailToClientResponse.response) {
    await logServerAction({
      user_id: null,
      action: `Sent trial ending in ${daysRemaining} email to client: ${to}`,
      payload: {
        clientEmail: to,
        daysRemaining
      },
      status: 'success',
      error: '',
      duration_ms: 0,
      type: 'action'
    })
  } else if (sendEmailToClientResponse.rejected) {
    await logServerAction({
      user_id: null,
      action: `Failed to send trial ending in ${daysRemaining} email to client: ${to}`,
      payload: {
        clientEmail: to,
        daysRemaining
      },
      status: 'fail',
      error: '',
      duration_ms: 0,
      type: 'action'
    })
  }

  return sendEmailToClientResponse
}

export const sendSubscriptionEndingNotificationToSupport = async ({ daysRemaining, clientEmail, clientId }: SendEndingSubscriptionEmail): Promise<SentMessageInfo> => {

  const { clientSubscriptionPlanData } = await readClientSubscriptionPlanFromClientId(clientId)

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Subscription Ending Soon</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f68a00;
    }
    table {
      border-spacing: 0;
      font-family: Arial, sans-serif;
    }
    img {
      display: block;
      max-width: 100%;
      height: auto;
    }
    .wrapper {
      width: 100%;
      background-color: #f68a00;
      padding: 20px;
    }
    .main {
      background-color: #ffffff;
      margin: 0 auto;
      width: 100%;
      max-width: 800px;
      border-radius: 10px;
    }
    .column td {
      padding: 10px;
      vertical-align: top;
      text-align: center;
    }
    .footer {
      background-color: #4a1005;
      color: white;
      font-weight: bold;
      font-size: 16px;
      padding: 15px;
      border-radius: 0 0 10px 10px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
    }
    a {
      color: #f68a00;
      font-weight: bold;
      text-decoration: none;
    }

    @media screen and (max-width: 600px) {
      .stack-column {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      .footer {
        flex-direction: column !important;
        text-align: center !important;
      }
    }
  </style>
</head>
<body>
  <center class="wrapper">
    <table role="presentation" class="main">
      <tr>
        <td style="padding: 40px 20px; text-align: center;">
          <h1 style="font-size: 48px; font-weight: 300; margin: 0;">Subscription ${clientSubscriptionPlanData?.subscription_plan.name} Ending Soon</h1>
          <h2 style="font-size: 24px; margin: 10px 0 20px;">Client Email: ${clientEmail}</h2>

          <p style="font-size: 16px; margin-top: 20px;">
            The subscription for the client above is about to end in <strong>${daysRemaining}</strong> days. Make sure to follow up with them.
          </p>

          <table role="presentation" width="100%" style="margin-top: 40px;">
            <tr>
              <td class="stack-column" width="33.33%">
                <table role="presentation" width="100%">
                  <tr>
                    <td>
                      <h3 style="font-style: italic; font-weight: bold;">A heartfelt thank you</h3>
                      <p style="font-size: 14px;">We truly appreciate your trust and support—it means the world to us.</p>
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
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
  `;

  const sendEmailToSupport = await transporter.sendMail({
    from: 'Nest Link <support@nest-link.app>',
    to: 'support@nest-link.app',
    subject: 'Client Subscription is ending soon',
    html: htmlContent
  });

  return sendEmailToSupport
}

export const sendSuccessfullClientRegistrationToSupport = async (clientEmail: string, contactPerson: string): Promise<SentMessageInfo> => {

  const htmlContent = `
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
    }

    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      background-color: #f2f2f2;
      padding: 20px;
      text-align: center;
    }

    .content {
      padding: 20px;
    }

    .footer {
      background-color: #f2f2f2;
      padding: 20px;
      text-align: center; 
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Client Registered Successfully</h1>
    </div>
    <div class="content">
      <p>Client Name: ${contactPerson}</p>
      <p>Client Email: ${clientEmail}</p>
    </div>
    <div class="footer">
      <p>Client Registered Successfully</p>
    </div>
  </div>
</body>
</html>
  `;

  const sendEmailToSupport = await transporter.sendMail({
    from: 'Nest Link <support@nest-link.app>',
    to: 'support@nest-link.app',
    subject: 'Client Registered Successfully',
    html: htmlContent
  });

  return sendEmailToSupport
}

export const sendClientContactMessageToSupport = async (clientEmail: string, contactPerson: string, message: string, subject: string): Promise<SentMessageInfo> => {

  const htmlContent = `
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
    }

    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      background-color: #f2f2f2;
      padding: 20px;
      text-align: center;
    }

    .content {
      padding: 20px;
    }

    .footer {
      background-color: #f2f2f2;
      padding: 20px;
      text-align: center; 
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Client Contact Message</h1>
    </div>
    <div class="content">
      <p>Client Name: ${contactPerson}</p>
      <p>Client Email: ${clientEmail}</p>
      <p>Message: ${message}</p>
    </div>
      </div>
</body>
</html>
  `;

  const sendEmailToSupport = await transporter.sendMail({
    from: 'Nest Link <support@nest-link.app>',
    to: 'support@nest-link.app',
    subject: subject,
    html: htmlContent
  });

  return sendEmailToSupport

}
