export async function sendSmsAws(to: string, message: string): Promise<{ ok: boolean; error?: string }> {
     try {
          const mod: any = await import('@aws-sdk/client-sns');
          const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-central-1';
          const client = new mod.SNSClient({ region });
          const attrs: any = {
               'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' }
          };
          if (process.env.AWS_SNS_SENDER_ID) {
               attrs['AWS.SNS.SMS.SenderID'] = { DataType: 'String', StringValue: process.env.AWS_SNS_SENDER_ID };
          }
          const cmd = new mod.PublishCommand({ PhoneNumber: to, Message: message, MessageAttributes: attrs });
          const res = await client.send(cmd);
          return { ok: !!res?.MessageId };
     } catch (e: any) {
          return { ok: false, error: e?.message || 'aws sns error' };
     }
}
