'use server';

import crypto from 'crypto';
import { sendAccessDeniedEmail, sendAccessRequestApprovedEmail, sendAccessRequestClientEmail } from 'src/libs/email/node-mailer';
import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import log from 'src/utils/logger';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise'

const SIGNING_SECRET = (process.env.ACCESS_REQUEST_SIGNING_SECRET || process.env.NEXT_PUBLIC_ACCESS_REQUEST_SIGNING_SECRET || '').trim();
const FORM_SECRET = (process.env.ACCESS_REQUEST_FORM_SECRET || process.env.NEXT_PUBLIC_ACCESS_REQUEST_FORM_SECRET || '').trim();
const RECAPTCHA_PROJECT_ID = process.env.RECAPTCHA_PROJECT_ID!.trim()
const NEXT_PUBLIC_RECAPTCHA_SITE_KEY = (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '').trim();
const ADMIN_EMAIL = (process.env.ACCESS_REQUEST_ADMIN_EMAIL || process.env.EMAIL_SMTP_USER || '').trim();
const RECAPTCHA_MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE || '0.3');
const RECAPTCHA_ACTION = process.env.RECAPTCHA_ACTION || 'access_request';
const DEFAULT_TENANT_PASSWORD = process.env.ACCESS_REQUEST_DEFAULT_PASSWORD || 'TempPass123!';

let recaptchaClient: any | null = null;
let serviceAccountCredentials: Record<string, any> | null = null;

type AccessRequestPayload = {
     name: string;
     email: string;
     message?: string;
     building_id?: string | null;
     building_label?: string | null;
     apartment_id?: string | null;
     apartment_label?: string | null;
};

const generateTempPassword = () => {
     const lower = 'abcdefghijklmnopqrstuvwxyz';
     const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
     const digits = '0123456789';
     const specials = '!@#$%^&*()_+-=[]{}|;:,.<>?';
     const pick = (pool: string) => pool[crypto.randomInt(0, pool.length)];

     try {
          const chars = [
               pick(lower),
               pick(upper),
               pick(digits),
               pick(specials),
          ];
          const all = lower + upper + digits + specials;
          while (chars.length < 8) {
               chars.push(pick(all));
          }
          for (let i = chars.length - 1; i > 0; i -= 1) {
               const j = crypto.randomInt(0, i + 1);
               [chars[i], chars[j]] = [chars[j], chars[i]];
          }
          return chars.join('');
     } catch (error) {
          log(`Access Request - failed to generate secure password, falling back to default: ${error?.message || error}`);
          return DEFAULT_TENANT_PASSWORD;
     }
};

type ApprovalResult =
     | { success: true; rejected?: boolean; email?: string; name?: string }
     | { success: false; error: string; code?: 'user_exists' | 'invalid_signature' | 'expired' | 'invalid_payload'; email?: string; name?: string };

const splitName = (fullName: string) => {
     const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
     if (!parts.length) return { firstName: '', lastName: '' };
     const [firstName, ...rest] = parts;
     return { firstName, lastName: rest.join(' ') };
};

const getUserExistsCode = (error: any): 'user_exists' | undefined => {
     if (typeof error?.status === 'number' && error.status === 422) return 'user_exists';
     if (typeof error?.code === 'string' && error.code.toLowerCase().includes('exist')) return 'user_exists';
     const message = (error?.message || '').toLowerCase();
     if (message.includes('already registered') || message.includes('already exists') || message.includes('duplicate key')) {
          return 'user_exists';
     }
     return undefined;
};

const signPayload = (payload: AccessRequestPayload & { ts: number }) => {
     if (!SIGNING_SECRET) {
          throw new Error('ACCESS_REQUEST_SIGNING_SECRET not configured');
     }
     const serialized = JSON.stringify(payload);
     const hmac = crypto.createHmac('sha256', SIGNING_SECRET).update(serialized).digest('hex');
     return { serialized, signature: hmac };
};

const loadServiceAccountCredentials = () => {
     if (serviceAccountCredentials) return serviceAccountCredentials;

     const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64?.trim();
     if (!b64) return null;

     const jsonString = Buffer.from(b64, 'base64').toString('utf8');
     const parsed = JSON.parse(jsonString);

     if (!parsed?.client_email || !parsed?.private_key) {
          throw new Error('Service account JSON missing client_email/private_key');
     }

     serviceAccountCredentials = {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
          project_id: parsed.project_id,
     };

     return serviceAccountCredentials;
}

const getRecaptchaClient = () => {
     if (recaptchaClient) return recaptchaClient;

     const creds = loadServiceAccountCredentials();

     // If creds is null, the library will try ADC (GOOGLE_APPLICATION_CREDENTIALS, workload identity, etc.)
     // This is exactly what Google's samples assume.
     recaptchaClient = new RecaptchaEnterpriseServiceClient(
          creds
               ? {
                    projectId: creds.project_id || RECAPTCHA_PROJECT_ID || undefined,
                    credentials: {
                         client_email: creds.client_email,
                         private_key: creds.private_key,
                    },
               }
               : {}
     );

     return recaptchaClient;
}

export const verifyRecaptchaEnterprise = async (token: string): Promise<{ ok: true; score: number } | { ok: false; error: string }> => {
     if (!RECAPTCHA_PROJECT_ID) return { ok: false, error: 'Missing RECAPTCHA_PROJECT_ID' };
     if (!NEXT_PUBLIC_RECAPTCHA_SITE_KEY) return { ok: false, error: 'Missing NEXT_PUBLIC_RECAPTCHA_SITE_KEY' };
     if (!token) return { ok: false, error: 'Captcha token missing' };

     try {
          const client = getRecaptchaClient();

          const [assessment] = await client.createAssessment({
               parent: client.projectPath(RECAPTCHA_PROJECT_ID),
               assessment: {
                    event: {
                         token,
                         siteKey: NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
                         expectedAction: RECAPTCHA_ACTION, // ✅ important
                    },
               },
          });

          // Token validity
          if (!assessment?.tokenProperties?.valid) {
               const reason = assessment?.tokenProperties?.invalidReason || 'unknown_reason';
               return { ok: false, error: `Captcha invalid: ${reason}` };
          }

          // Optional: still double-check what the client reported
          const action = assessment?.tokenProperties?.action || '';
          if (action && action !== RECAPTCHA_ACTION) {
               return { ok: false, error: `Captcha action mismatch: expected ${RECAPTCHA_ACTION}, got ${action}` };
          }

          const score = assessment?.riskAnalysis?.score ?? 0;
          if (score < RECAPTCHA_MIN_SCORE) {
               return { ok: false, error: `Captcha score too low: ${score}` };
          }

          return { ok: true, score };
     } catch (e: any) {
          // This is the exact place your old "16 UNAUTHENTICATED" surfaced.
          return { ok: false, error: e?.message || 'Captcha verification failed' };
     }
}

export const submitAccessRequest = async ({
     name,
     email,
     message,
     buildingId,
     buildingLabel,
     apartmentId,
     apartmentLabel,
     recaptchaToken,
     formSecret,
}: {
     name: string;
     email: string;
     message?: string;
     buildingId?: string;
     buildingLabel?: string;
     apartmentId?: string;
     apartmentLabel?: string;
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

     if (!buildingId) {
          return { success: false, error: 'Building is required' };
     }

     if (!apartmentId) {
          return { success: false, error: 'Apartment is required' };
     }

     const payload: AccessRequestPayload & { ts: number } = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          message: message?.trim() || '',
          building_id: buildingId || null,
          building_label: buildingLabel || null,
          apartment_id: apartmentId || null,
          apartment_label: apartmentLabel || null,
          ts: Date.now(),
     };

     let serialized: string;
     let signature: string;
     try {
          ({ serialized, signature } = signPayload(payload));
     } catch (e: any) {
          return { success: false, error: e?.message || 'Failed to sign request' };
     }

     const baseLink = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/access-request/approve?payload=${encodeURIComponent(serialized)}&sig=${signature}`;
     const approveLink = `${baseLink}&action=approve`;
     const rejectLink = `${baseLink}&action=reject`;

     let buildingClientEmail: string | null = null;
     try {
          if (buildingId) {
               const supabase = await useServerSideSupabaseAnonClient();
               const { data: buildingRow } = await supabase
                    .from(TABLES.BUILDINGS)
                    .select('customerId')
                    .eq('id', buildingId)
                    .single();
               const customerId = (buildingRow as any)?.customerId;
               if (customerId) {
                    const { data: clientRow } = await supabase.from(TABLES.POLAR_CUSTOMERS).select('email').eq('id', customerId).single();
                    buildingClientEmail = (clientRow as any)?.email || null;
               }
          }
     } catch {
          // If we fail to fetch building client email, we still proceed with admin email.
          log(`Access Request - failed to fetch building client email for building ID: ${buildingId}`);
     }

     const recipients = Array.from(new Set([ADMIN_EMAIL, buildingClientEmail].filter(Boolean))) as string[];
     const emailResult = await sendAccessRequestClientEmail(recipients, {
          locale: 'rs',
          name: payload.name,
          email: payload.email,
          message: payload.message,
          building: payload.building_label,
          apartment: payload.apartment_label,
          approveLink,
          rejectLink,
     });
     if (!emailResult.ok) {
          return { success: false, error: emailResult.error || 'Failed to send email' };
     }

     return { success: true };
};

export const approveAccessRequest = async (
     serialized: string,
     signature: string,
     action: 'approve' | 'reject' = 'approve'
): Promise<ApprovalResult> => {
     if (!SIGNING_SECRET) {
          return { success: false, error: 'Signing secret not configured', code: 'invalid_signature' };
     }
     if (!serialized || !signature) {
          return { success: false, error: 'Missing payload', code: 'invalid_payload' };
     }

     const expectedSig = crypto.createHmac('sha256', SIGNING_SECRET).update(serialized).digest('hex');
     const providedSigBuf = Buffer.from(signature);
     const expectedSigBuf = Buffer.from(expectedSig);
     if (providedSigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(providedSigBuf, expectedSigBuf)) {
          return { success: false, error: 'Invalid signature', code: 'invalid_signature' };
     }

     let parsed: AccessRequestPayload & { ts: number };
     try {
          parsed = JSON.parse(serialized);
     } catch {
          return { success: false, error: 'Invalid payload', code: 'invalid_payload' };
     }

     // Optional: expire after 48h
     const twoDays = 1000 * 60 * 60 * 48;
     if (Date.now() - parsed.ts > twoDays) {
          return { success: false, error: 'Request expired', code: 'expired', email: parsed.email, name: parsed.name };
     }

     if (action === 'reject') {
          const deniedEmail = await sendAccessDeniedEmail(parsed.email, {
               locale: 'rs',
               name: parsed.name,
               email: parsed.email,
               contactSupportUrl: `https://nest-link.app/contact`,
          });
          if (!deniedEmail.ok) {
               return { success: false, error: deniedEmail.error || 'Failed to send denial email', email: parsed.email, name: parsed.name };
          }
          return { success: true, rejected: true, email: parsed.email, name: parsed.name };
     }

     const supabase = await useServerSideSupabaseAnonClient();
     const supabaseAdmin = await useServerSideSupabaseServiceRoleClient();
     const { firstName, lastName } = splitName(parsed.name);
     const tempPassword = generateTempPassword();

     // Create auth user with default password
     const { data: createdUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
          email: parsed.email,
          email_confirm: true,
          password: tempPassword,
          user_metadata: { name: parsed.name, requested_via: 'access-request' },
     });
     if (userError || !createdUser?.user) {
          return {
               success: false,
               error: userError?.message || 'Failed to create user',
               code: getUserExistsCode(userError),
               email: parsed.email,
               name: parsed.name,
          };
     }

     // Insert tenant row with minimal info; apartment/building assignment can be done later
     const { data: tenantRows, error: tenantError } = await supabase
          .from(TABLES.TENANTS)
          .insert({
               first_name: firstName || parsed.name,
               last_name: lastName || '',
               email: parsed.email,
               user_id: createdUser.user.id,
               is_primary: false,
               tenant_type: 'other',
               notes: 'Created via access request approval',
               apartment_id: parsed.apartment_id ?? null,
          })
          .select('id')
          .single();

     if (tenantError) {
          await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);
          return {
               success: false,
               error: tenantError.message || 'Failed to create tenant',
               email: parsed.email,
               name: parsed.name,
          };
     }

     const tenantId = (tenantRows as any)?.id as string | undefined;
     if (!tenantId) {
          await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);
          return {
               success: false,
               error: 'Tenant record created but ID was not returned',
               email: parsed.email,
               name: parsed.name,
          };
     }

     const { error: profileError } = await supabase.from(TABLES.TENANT_PROFILES).insert({
          tenant_id: tenantId,
          first_name: firstName || parsed.name || parsed.email || 'Tenant',
          last_name: lastName || '',
          email: parsed.email,
     });

     if (profileError) {
          await supabase.from(TABLES.TENANTS).delete().eq('id', tenantId);
          await supabase.auth.admin.deleteUser(createdUser.user.id);
          return {
               success: false,
               error: profileError.message || 'Failed to create tenant profile',
               email: parsed.email,
               name: parsed.name,
          };
     }

     const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '').replace(/\/$/, '');
     const loginUrl = `${baseUrl || ''}/auth/login`;
     const welcomeEmail = await sendAccessRequestApprovedEmail(parsed.email, {
          locale: 'rs',
          name: parsed.name,
          email: parsed.email,
          password: tempPassword,
          loginUrl,
     });
     if (!welcomeEmail.ok) {
          return {
               success: false,
               error: welcomeEmail.error || 'Failed to send welcome email',
               email: parsed.email,
               name: parsed.name,
          };
     }

     return { success: true, email: parsed.email, name: parsed.name };
};

export const getAccessRequestBuildingOptions = async (): Promise<{
     success: boolean;
     data?: Array<{ id: string; label: string; country?: string; city?: string }>;
     countries?: string[];
}> => {
     try {
          // Use service role to bypass any RLS that might hide location fields on the public form.
          // We query the locations table (which holds the FK to buildings) so we can surface the address instead of the building UUID.
          const supabase = await useServerSideSupabaseAnonClient();
          const { data, error } = await supabase
               .from(TABLES.BUILDING_LOCATIONS)
               .select('country, building_id, street_address, street_number, city, location_id')
               .not('building_id', 'is', null);

          if (error) {
               logServerAction({
                    user_id: null,
                    action: 'getAccessRequestBuildingOptions',
                    duration_ms: 0,
                    error: error.message,
                    payload: { data },
                    status: 'fail',
                    type: 'db'
               });
               return { success: false };
          }

          const seen = new Set<string>();
          const countriesSet = new Set<string>();
          const options = (data || []).reduce<Array<{ id: string; label: string; country?: string; city?: string }>>((acc, loc: any) => {
               if (!loc?.building_id || seen.has(loc.building_id)) return acc;
               const address = [loc.street_address, loc.street_number, loc.city]
                    .filter((part: string) => !!part && part.trim().length > 0)
                    .join(' ')
                    .trim();
               const country = (loc.country || '').trim();
               const city = (loc.city || '').trim();
               if (country) countriesSet.add(country);
               acc.push({
                    id: loc.building_id,
                    label: address || loc.location_id || loc.building_id,
                    country,
                    city,
               });
               seen.add(loc.building_id);
               return acc;
          }, []).sort((a, b) => a.label.localeCompare(b.label));

          return { success: true, data: options, countries: Array.from(countriesSet).sort((a, b) => a.localeCompare(b)) };
     } catch {
          return { success: false };
     }
};

export const getAccessRequestApartments = async (
     buildingId: string
): Promise<{ success: boolean; data?: Array<{ id: string; label: string }> }> => {
     if (!buildingId) return { success: false };
     try {
          const supabase = await useServerSideSupabaseAnonClient();
          const { data, error } = await supabase
               .from(TABLES.APARTMENTS)
               .select('id, apartment_number')
               .eq('building_id', buildingId)
               .order('apartment_number', { ascending: true });

          if (error) {
               log(`Access Request - failed to fetch apartments for building ${buildingId}: ${error.message}`);
               return { success: false };
          }

          const options = (data || []).map((apt: any) => ({
               id: apt.id,
               label: (apt.apartment_number || '').toString() || apt.id,
          }));

          return { success: true, data: options };
     } catch (e: any) {
          log(`Access Request - unexpected error fetching apartments: ${e?.message || e}`);
          return { success: false };
     }
};
