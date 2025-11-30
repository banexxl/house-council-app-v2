'use server';

import crypto from 'crypto';
import fs from 'fs';
import { sendAccessRequestClientEmail } from 'src/libs/email/node-mailer';
import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import log from 'src/utils/logger';

const SIGNING_SECRET = (process.env.ACCESS_REQUEST_SIGNING_SECRET || process.env.NEXT_PUBLIC_ACCESS_REQUEST_SIGNING_SECRET || '').trim();
const FORM_SECRET = (process.env.ACCESS_REQUEST_FORM_SECRET || process.env.NEXT_PUBLIC_ACCESS_REQUEST_FORM_SECRET || '').trim();
const RECAPTCHA_PROJECT_ID = (process.env.RECAPTCHA_PROJECT_ID || process.env.GCLOUD_PROJECT || '').trim();
const APPROVAL_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';
const RECAPTCHA_SITE_KEY = (process.env.RECAPTCHA_SITE_KEY || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '').trim();
const ADMIN_EMAIL = (process.env.ACCESS_REQUEST_ADMIN_EMAIL || process.env.EMAIL_SMTP_USER || '').trim();
const RECAPTCHA_MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE || '0.3');
const RECAPTCHA_ACTION = process.env.RECAPTCHA_ACTION || 'access_request';
const DEFAULT_TENANT_PASSWORD = process.env.ACCESS_REQUEST_DEFAULT_PASSWORD || 'TempPass123!';

let recaptchaClient: any | null = null;
let serviceAccountCredentials: Record<string, any> | null = null;

const loadServiceAccountCredentials = () => {
     if (serviceAccountCredentials) return serviceAccountCredentials;

     // 1. Load from Base64 (recommended)
     if (process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
          try {
               const jsonString = Buffer.from(
                    process.env.GOOGLE_SERVICE_ACCOUNT_BASE64,
                    'base64'
               ).toString('utf8');

               serviceAccountCredentials = JSON.parse(jsonString);
               return serviceAccountCredentials;
          } catch (e: any) {
               log(
                    `Access Request - failed to decode GOOGLE_SERVICE_ACCOUNT_BASE64: ${e?.message || e}`
               );
          }
     }

     // 2. Fallback: raw JSON in env (optional)
     if (!serviceAccountCredentials && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
          try {
               serviceAccountCredentials = JSON.parse(
                    process.env.GOOGLE_SERVICE_ACCOUNT_JSON
               );
               return serviceAccountCredentials;
          } catch (e: any) {
               log(
                    `Access Request - failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: ${e?.message || e}`
               );
          }
     }

     // 3. Fallback: load from local file (local dev only)
     if (!serviceAccountCredentials && process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
          try {
               const fileContents = fs.readFileSync(
                    process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
                    'utf8'
               );
               serviceAccountCredentials = JSON.parse(fileContents);
               return serviceAccountCredentials;
          } catch (e: any) {
               log(
                    `Access Request - failed to read credentials file (${process.env.GOOGLE_SERVICE_ACCOUNT_PATH}): ${e?.message || e}`
               );
          }
     }

     return serviceAccountCredentials;
};


const getRecaptchaClient = async () => {
     if (recaptchaClient) return recaptchaClient;

     const credentials = loadServiceAccountCredentials();
     const { RecaptchaEnterpriseServiceClient } = await import('@google-cloud/recaptcha-enterprise');

     recaptchaClient = credentials
          ? new RecaptchaEnterpriseServiceClient({ credentials })
          : new RecaptchaEnterpriseServiceClient();

     return recaptchaClient;
};

type AccessRequestPayload = {
     name: string;
     email: string;
     message?: string;
     building_id?: string | null;
     building_label?: string | null;
};

const signPayload = (payload: AccessRequestPayload & { ts: number }) => {
     if (!SIGNING_SECRET) {
          throw new Error('ACCESS_REQUEST_SIGNING_SECRET not configured');
     }
     const serialized = JSON.stringify(payload);
     const hmac = crypto.createHmac('sha256', SIGNING_SECRET).update(serialized).digest('hex');
     return { serialized, signature: hmac };
};

const verifyRecaptchaEnterprise = async (token: string) => {

     if (!RECAPTCHA_SITE_KEY || !RECAPTCHA_PROJECT_ID) {
          log('Access Request - recaptcha misconfigured: missing project or site key');
          return { ok: false, error: 'Captcha not configured' };
     }
     if (!token) {
          log('Access Request - recaptcha token missing');
          return { ok: false, error: 'Captcha token missing' };
     }
     try {
          const client = await getRecaptchaClient();
          const [assessment] = await client.createAssessment({
               assessment: {
                    event: {
                         token,
                         siteKey: RECAPTCHA_SITE_KEY,
                    },
               },
               parent: client.projectPath(RECAPTCHA_PROJECT_ID),
          });

          if (!assessment?.tokenProperties?.valid) {
               log(`Access Request - recaptcha invalid: ${assessment?.tokenProperties?.invalidReason || 'unknown reason'}`);
               return {
                    ok: false,
                    error: `Captcha invalid: ${assessment?.tokenProperties?.invalidReason || 'unknown reason'}`,
               };
          }

          const action = assessment.tokenProperties?.action || '';
          if (action && action !== RECAPTCHA_ACTION) {
               log(`Access Request - recaptcha action mismatch: expected ${RECAPTCHA_ACTION}, got ${action}`);
               return { ok: false, error: 'Captcha action mismatch' };
          }

          const score = assessment?.riskAnalysis?.score ?? 0;
          if (score < RECAPTCHA_MIN_SCORE) {
               log(`Access Request - recaptcha score too low: ${score}`);
               return { ok: false, error: 'Captcha score too low' };
          }

          log(`Access Request - recaptcha passed with score ${score}`);
          return { ok: true };
     } catch (e: any) {
          log(`Access Request - recaptcha verification failed: ${e?.message || e}`);
          return { ok: false, error: e?.message || 'Captcha verification failed' };
     }
};

export const submitAccessRequest = async ({
     name,
     email,
     message,
     buildingId,
     buildingLabel,
     recaptchaToken,
     formSecret,
}: {
     name: string;
     email: string;
     message?: string;
     buildingId?: string;
     buildingLabel?: string;
     recaptchaToken: string;
     formSecret: string;
}) => {
     if (!formSecret || formSecret.trim() !== FORM_SECRET) {
          return { success: false, error: 'Invalid form secret' };
     }

     const captchaResult = await verifyRecaptchaEnterprise(recaptchaToken);
     if (!captchaResult.ok) return { success: false, error: captchaResult.error };

     if (!name?.trim() || !email?.trim()) {
          return { success: false, error: 'Name and email are required' };
     }

     if (!ADMIN_EMAIL) {
          return { success: false, error: 'Admin email not configured' };
     }

     const payload: AccessRequestPayload & { ts: number } = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          message: message?.trim() || '',
          building_id: buildingId || null,
          building_label: buildingLabel || null,
          ts: Date.now(),
     };

     let serialized: string;
     let signature: string;
     try {
          ({ serialized, signature } = signPayload(payload));
     } catch (e: any) {
          return { success: false, error: e?.message || 'Failed to sign request' };
     }

     const baseLink = `${APPROVAL_BASE_URL || ''}/api/access-request/approve?payload=${encodeURIComponent(serialized)}&sig=${signature}`;
     const approveLink = `${baseLink}&action=approve`;
     const rejectLink = `${baseLink}&action=reject`;

     let buildingClientEmail: string | null = null;
     try {
          if (buildingId) {
               const supabase = await useServerSideSupabaseServiceRoleClient();
               const { data: buildingRow } = await supabase
                    .from(TABLES.BUILDINGS)
                    .select('client_id')
                    .eq('id', buildingId)
                    .single();
               const clientId = (buildingRow as any)?.client_id;
               if (clientId) {
                    const { data: clientRow } = await supabase.from(TABLES.CLIENTS).select('email').eq('id', clientId).single();
                    buildingClientEmail = (clientRow as any)?.email || null;
               }
          }
     } catch {
          // If we fail to fetch building client email, we still proceed with admin email.
          log(`Access Request - failed to fetch building client email for building ID: ${buildingId}`);
     }

     // const emailHtml = `
     //      <p>A new access request was submitted.</p>
     //      <ul>
     //           <li><strong>Name:</strong> ${payload.name}</li>
     //           <li><strong>Email:</strong> ${payload.email}</li>
     //           ${payload.message ? `<li><strong>Message:</strong> ${payload.message}</li>` : ''}
     //           ${payload.building_label ? `<li><strong>Building:</strong> ${payload.building_label}</li>` : ''}
     //      </ul>
     //      <p>Click to approve and provision a tenant account: <a href="${approveLink}">${approveLink}</a></p>
     //      <p>To reject this request, click here: <a href="${rejectLink}">${rejectLink}</a></p>
     // `;

     const recipients = Array.from(new Set([ADMIN_EMAIL, buildingClientEmail].filter(Boolean))) as string[];
     const emailResult = await sendAccessRequestClientEmail(recipients, {
          name: payload.name,
          email: payload.email,
          message: payload.message,
          building: payload.building_label,
          approveLink,
          rejectLink,
     });
     if (!emailResult.ok) {
          return { success: false, error: emailResult.error || 'Failed to send email' };
     }

     return { success: true };
};

export const approveAccessRequest = async (serialized: string, signature: string, action: 'approve' | 'reject' = 'approve') => {
     if (!SIGNING_SECRET) {
          return { success: false, error: 'Signing secret not configured' };
     }
     if (!serialized || !signature) {
          return { success: false, error: 'Missing payload' };
     }

     const expectedSig = crypto.createHmac('sha256', SIGNING_SECRET).update(serialized).digest('hex');
     if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
          return { success: false, error: 'Invalid signature' };
     }

     let parsed: AccessRequestPayload & { ts: number };
     try {
          parsed = JSON.parse(serialized);
     } catch {
          return { success: false, error: 'Invalid payload' };
     }

     // Optional: expire after 48h
     const twoDays = 1000 * 60 * 60 * 48;
     if (Date.now() - parsed.ts > twoDays) {
          return { success: false, error: 'Request expired' };
     }

     if (action === 'reject') {
          return { success: true, rejected: true };
     }

     const supabase = await useServerSideSupabaseServiceRoleClient();

     // Create auth user with default password
     const { data: createdUser, error: userError } = await supabase.auth.admin.createUser({
          email: parsed.email,
          email_confirm: true,
          password: DEFAULT_TENANT_PASSWORD,
          user_metadata: { name: parsed.name, requested_via: 'access-request' },
     });
     if (userError || !createdUser?.user) {
          return { success: false, error: userError?.message || 'Failed to create user' };
     }

     // Insert tenant row with minimal info; apartment/building assignment can be done later
     const { error: tenantError } = await supabase
          .from(TABLES.TENANTS)
          .insert({
               first_name: parsed.name,
               last_name: '',
               email: parsed.email,
               user_id: createdUser.user.id,
               is_primary: false,
               tenant_type: 'other',
               building_id: parsed.building_id ?? null,
          });

     if (tenantError) {
          return { success: false, error: tenantError.message || 'Failed to create tenant' };
     }

     return { success: true };
};

export const getAccessRequestBuildingOptions = async (): Promise<{
     success: boolean;
     data?: Array<{ id: string; label: string; country?: string }>;
     countries?: string[];
}> => {
     try {
          // Use service role to bypass any RLS that might hide location fields on the public form.
          // We query the locations table (which holds the FK to buildings) so we can surface the address instead of the building UUID.
          const supabase = await useServerSideSupabaseServiceRoleClient();
          const { data, error } = await supabase
               .from(TABLES.BUILDING_LOCATIONS)
               .select('country, building_id, street_address, street_number, city, location_id')
               .not('building_id', 'is', null);

          log(`Access Request - fetched building locations: ${data?.length || 0} - error: ${error?.message || 'none'}`);
          if (error) return { success: false };

          const seen = new Set<string>();
          const countriesSet = new Set<string>();
          const options = (data || []).reduce<Array<{ id: string; label: string; country?: string }>>((acc, loc: any) => {
               if (!loc?.building_id || seen.has(loc.building_id)) return acc;
               const address = [loc.street_address, loc.street_number, loc.city]
                    .filter((part: string) => !!part && part.trim().length > 0)
                    .join(' ')
                    .trim();
               const country = (loc.country || '').trim();
               if (country) countriesSet.add(country);
               acc.push({
                    id: loc.building_id,
                    label: address || loc.location_id || loc.building_id,
                    country,
               });
               seen.add(loc.building_id);
               return acc;
          }, []).sort((a, b) => a.label.localeCompare(b.label));

          return { success: true, data: options, countries: Array.from(countriesSet).sort((a, b) => a.localeCompare(b)) };
     } catch {
          return { success: false };
     }
};
