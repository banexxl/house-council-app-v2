import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-central-1';
const client = new SNSClient({ region });

export async function sendSmsAws(to: string, message: string): Promise<{ ok: boolean; error?: string }> {
     try {
          const cmd = new PublishCommand({
               PhoneNumber: to,
               Message: message,
               MessageAttributes: {
                    'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
               },
          });
          const res = await client.send(cmd);
          return { ok: !!res.MessageId };
     } catch (e: any) {
          return { ok: false, error: e?.message || 'aws sns error' };
     }
}
