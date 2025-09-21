'use server';

import nodemailer from 'nodemailer';
import { SentMessageInfo } from 'nodemailer/lib/sendmail-transport';
import { logServerAction } from '../supabase/server-logging';
import { htmlToPlainText } from 'src/utils/html-tags-remover';
import { buildTrialEndingEmailHtml } from './messages/trial-ending';
import { buildSubscriptionEndingSupportHtml } from './messages/subscription-ending-support';
import { buildSuccessfulRegistrationHtml, buildClientContactMessageHtml } from './messages/support-registration';
import { buildNotificationGenericHtml } from './messages/notification-generic';
import { readClientSubscriptionPlanFromClientId } from 'src/app/actions/subscription-plan/subscription-plan-actions';

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
  clientEmail: string,
  clientId: string
}

interface SendTrialEndingEmail {
  to: string;
  daysRemaining: number;
}

export const sendTrialEndingEmailToClient = async ({ to, daysRemaining }: SendTrialEndingEmail): Promise<SentMessageInfo> => {
  const htmlContent = buildTrialEndingEmailHtml(daysRemaining);

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

  const htmlContent = buildSubscriptionEndingSupportHtml(
    clientSubscriptionPlanData?.subscription_plan.name,
    clientEmail,
    daysRemaining
  );

  const sendEmailToSupport = await transporter.sendMail({
    from: 'Nest Link <support@nest-link.app>',
    to: 'support@nest-link.app',
    subject: 'Client Subscription is ending soon',
    html: htmlContent
  });

  return sendEmailToSupport
}

export const sendSuccessfullClientRegistrationToSupport = async (clientEmail: string, contactPerson: string): Promise<SentMessageInfo> => {
  const htmlContent = buildSuccessfulRegistrationHtml(clientEmail, contactPerson);

  const sendEmailToSupport = await transporter.sendMail({
    from: 'Nest Link <support@nest-link.app>',
    to: 'support@nest-link.app',
    subject: 'Client Registered Successfully',
    html: htmlContent
  });

  return sendEmailToSupport
}

export const sendClientContactMessageToSupport = async (clientEmail: string, contactPerson: string, message: string, subject: string): Promise<SentMessageInfo> => {
  const htmlContent = buildClientContactMessageHtml(clientEmail, contactPerson, message);

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
  const injected = html ? `<p style="font-size: 16px;">${html}</p>` : '';
  const htmlContent = buildNotificationGenericHtml(injected);

  try {
    const info = await transporter.sendMail({
      from: process.env.NOTIFICATIONS_EMAIL_FROM || 'Nest Link <no-reply@nest-link.app>',
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
