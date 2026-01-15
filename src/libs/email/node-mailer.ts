'use server';

import nodemailer from 'nodemailer';
import { SentMessageInfo } from 'nodemailer/lib/sendmail-transport';
import { logServerAction } from '../supabase/server-logging';
import { htmlToPlainText } from 'src/utils/html-tags-remover';
import { buildTrialEndingEmail } from './messages/trial-ending';
import { buildSubscriptionEndingSupportEmail } from './messages/subscription-ending-support';
import { buildSuccessfulRegistrationEmail, buildClientContactMessageEmail } from './messages/support-registration';
import { buildNotificationGenericHtml } from './messages/notification-generic';
import { buildAccessRequestClientEmail } from './messages/access-request-client';
import { buildAccessDeniedEmail, buildAccessRequestApprovedEmail } from './messages/access-request-approved';
import { getProductFromCustomerSubscription, readCustomerSubscriptionPlanFromCustomerId } from 'src/app/actions/subscription-plan/subscription-plan-actions';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST!,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_SMTP_USER!,
    pass: process.env.EMAIL_SMTP_PASS!,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

type SendEndingSubscriptionEmail = {
  daysRemaining: number,
  customerEmail: string,
  customerId: string
}

interface SendTrialEndingEmail {
  to: string;
  daysRemaining: number;
  locale?: string;
}

export const sendTrialEndingEmailToClient = async ({ to, daysRemaining, locale = 'rs' }: SendTrialEndingEmail): Promise<SentMessageInfo> => {
  const { subject, injectedHtml } = await buildTrialEndingEmail(locale, daysRemaining);
  const htmlContent = buildNotificationGenericHtml(injectedHtml, subject);

  const sendEmailToClientResponse = await transporter.sendMail({
    from: 'Nest Link <no-reply@nest-link.app>',
    to,
    subject,
    html: htmlContent,
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

export const sendSubscriptionEndingNotificationToSupport =
  async ({ daysRemaining, customerEmail, customerId }:
    SendEndingSubscriptionEmail): Promise<SentMessageInfo> => {

    const customersProduct = await getProductFromCustomerSubscription(customerId)
    const { customerSubscriptionPlanData } = await readCustomerSubscriptionPlanFromCustomerId(customerId)

    const { subject, injectedHtml } = await buildSubscriptionEndingSupportEmail('rs', customersProduct?.name, customerEmail, daysRemaining);
    const htmlContent = buildNotificationGenericHtml(injectedHtml, subject);

    const sendEmailToSupport = await transporter.sendMail({
      from: 'Nest Link <support@nest-link.app>',
      to: 'support@nest-link.app',
      subject,
      html: htmlContent
    });

    return sendEmailToSupport
  }

export const sendSuccessfullClientRegistrationToSupport = async (clientEmail: string, contactPerson: string, locale: string = 'rs'): Promise<SentMessageInfo> => {
  const { subject, injectedHtml } = await buildSuccessfulRegistrationEmail(locale, clientEmail, contactPerson);
  const htmlContent = buildNotificationGenericHtml(injectedHtml, subject);

  const sendEmailToSupport = await transporter.sendMail({
    from: 'Nest Link <support@nest-link.app>',
    to: 'support@nest-link.app',
    subject,
    html: htmlContent,
  });

  return sendEmailToSupport
}

export const sendClientContactMessageToSupport = async (clientEmail: string, contactPerson: string, message: string, subject: string, locale: string = 'rs'): Promise<SentMessageInfo> => {
  const { injectedHtml } = await buildClientContactMessageEmail(locale, clientEmail, contactPerson, message);
  const htmlContent = buildNotificationGenericHtml(injectedHtml, subject);

  const sendEmailToSupport = await transporter.sendMail({
    from: 'Nest Link <support@nest-link.app>',
    to: 'support@nest-link.app',
    subject: subject,
    html: htmlContent
  });

  return sendEmailToSupport

}

// Lightweight generic sender for notification emails
export const sendNotificationEmail = async (
  to: string[],
  subject: string,
  html: string,
  textFallback?: string
): Promise<{ ok: boolean; error?: string }> => {
  const htmlContent = buildNotificationGenericHtml(html, subject);

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_SMTP_USER!,
      to,
      subject,
      html: htmlContent,
      text: textFallback || htmlToPlainText(html),
    });

    if ((info as any)?.response) return { ok: true };
    if ((info as any)?.rejected?.length) return { ok: false, error: 'rejected' };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'sendMail failed' };
  }
}

export const sendAccessRequestClientEmail = async (
  to: string[],
  data: {
    locale?: string;
    name: string;
    email: string;
    message?: string;
    building?: string | null;
    apartment?: string | null;
    approveLink: string;
    rejectLink: string;
  }
): Promise<{ ok: boolean; error?: string }> => {
  const { subject, injectedHtml } = await buildAccessRequestClientEmail({ locale: data.locale || 'rs', ...data });
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_SMTP_USER!,
      to,
      subject,
      html: injectedHtml,
      text: `${data.name} (${data.email}) requested access${data.building ? ` for ${data.building}` : ''}${data.apartment ? `, apartment ${data.apartment}` : ''}. Approve: ${data.approveLink} / Reject: ${data.rejectLink}`,
    });
    if ((info as any)?.response) return { ok: true };
    if ((info as any)?.rejected?.length) return { ok: false, error: 'rejected' };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'sendMail failed' };
  }
};

export const sendAccessRequestApprovedEmail = async (
  to: string,
  data: { locale: string; name: string; email: string; password: string; loginUrl: string }
): Promise<{ ok: boolean; error?: string }> => {
  const { subject, injectedHtml } = await buildAccessRequestApprovedEmail(data);
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_SMTP_USER!,
      to,
      subject,
      html: injectedHtml,
      text: `Hi ${data.name || 'there'}, your tenant account is ready. Login: ${data.loginUrl} with email ${data.email} and password ${data.password}. Please change your password after logging in.`,
    });
    if ((info as any)?.response) return { ok: true };
    if ((info as any)?.rejected?.length) return { ok: false, error: 'rejected' };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'sendMail failed' };
  }
};

export const sendAccessDeniedEmail = async (
  to: string,
  data: { locale: string; name: string; email: string; contactSupportUrl: string }
): Promise<{ ok: boolean; error?: string }> => {
  const { subject, injectedHtml } = await buildAccessDeniedEmail(data);
  console.log('subject', subject);
  console.log('inserted', injectedHtml);


  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_SMTP_USER!,
      to,
      subject,
      html: injectedHtml,
      text: `Hi ${data.name || 'there'}, your access request has been denied. If you believe this is a mistake, please contact support at: ${data.contactSupportUrl}`,
    });
    console.log('email sent info', info);

    if ((info as any)?.response) return { ok: true };
    if ((info as any)?.rejected?.length) return { ok: false, error: 'rejected' };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'sendMail failed' };
  }
};
