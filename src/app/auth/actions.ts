'use server';

import { logServerAction } from 'src/libs/supabase/server-logging';
import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { readClientFromClientMemberID } from '../actions/client/client-members';
import { TABLES } from 'src/libs/supabase/tables';
import { checkClientSubscriptionStatus } from '../actions/subscription-plan/subscription-plan-actions';
import { getClientIdFromTenantBuilding } from '../actions/tenant/tenant-actions';

const AUTH_COOKIES = [
     'sb-sorklznvftjmhkaejkej-auth-token',
     'sb-sorklznvftjmhkaejkej-auth-token-code-verifier',
];

export type SignInFormValues = {
     email: string;
     password: string;
     ip: string;
};

export type ErrorType = {
     code: string;
     details: string;
     hint?: string;
     message?: string;
}

export const magicLinkLogin = async (email: string, ipAddress: string): Promise<{ success?: boolean, error?: string }> => {

     const supabase = await useServerSideSupabaseServiceRoleClient();

     // Check tblSuperAdmins, tblClients, tblTenants for user existence
     let userType: 'client' | 'tenant' | 'admin' | null = null;
     let userId: string | null = null;
     let userFound = false;

     // 1. Check tblSuperAdmins
     const { data: admin, error: adminError } = await supabase
          .from(TABLES.SUPER_ADMINS)
          .select('id')
          .eq('email', email)
          .single();

     if (admin) {
          userType = 'admin';
          userId = admin.id;
          userFound = true;
     }

     // 2. If not found, check tblClients
     if (!userFound) {
          const { data: client, error: clientError } = await supabase
               .from(TABLES.CLIENTS)
               .select('id')
               .eq('email', email)
               .single();

          if (client) {
               userType = 'client';
               userId = client.id;
               userFound = true;
          } else if (clientError && clientError.code !== 'PGRST116') {
               await logServerAction({
                    user_id: null,
                    action: 'NLA - Magic link client lookup failed',
                    payload: { email },
                    status: 'fail',
                    error: clientError.message,
                    duration_ms: 0,
                    type: 'auth',
               });
               return { error: clientError.message };
          }
     }

     // 3. If not found, check tblTenants
     if (!userFound) {
          const { data: tenant, error: tenantError } = await supabase
               .from(TABLES.TENANTS)
               .select('id')
               .eq('email', email)
               .single();

          if (tenant) {
               userType = 'tenant';
               userId = tenant.id;
               userFound = true;

               try {
                    // Additional null check for TypeScript
                    if (!userId) {
                         await logServerAction({
                              user_id: null,
                              action: 'NLA - Magic link failed - tenant ID is null',
                              payload: { email },
                              status: 'fail',
                              error: 'Tenant ID is null',
                              duration_ms: 0,
                              type: 'auth'
                         });
                         return { error: 'Account data is invalid. Please contact support.' };
                    }

                    // Get client ID from tenant's building
                    const { data: customerId, success: clientIdSuccess, error: clientIdError } = await getClientIdFromTenantBuilding(userId);

                    if (!clientIdSuccess || !customerId) {
                         await logServerAction({
                              user_id: userId,
                              action: 'NLA - Magic link failed - could not get client ID from tenant building',
                              payload: { email, tenantId: userId, error: clientIdError },
                              status: 'fail',
                              error: clientIdError || 'Failed to get client ID',
                              duration_ms: 0,
                              type: 'auth'
                         });
                         return { error: 'Unable to verify your building association. Please contact support.' };
                    }

                    // Check client subscription status
                    const { success: subscriptionSuccess, isActive, error: subscriptionError } = await checkClientSubscriptionStatus(customerId);

                    if (!subscriptionSuccess) {
                         await logServerAction({
                              user_id: userId,
                              action: 'NLA - Magic link failed - subscription check failed',
                              payload: { email, tenantId: userId, clientId: customerId, error: subscriptionError },
                              status: 'fail',
                              error: subscriptionError || 'Subscription check failed',
                              duration_ms: 0,
                              type: 'auth'
                         });
                         return { error: 'Unable to verify subscription. Please contact support.' };
                    }

                    if (!isActive) {
                         await logServerAction({
                              user_id: userId,
                              action: 'NLA - Magic link blocked - no active subscription for tenant building',
                              payload: { email, tenantId: userId, clientId: customerId },
                              status: 'fail',
                              error: 'No active subscription found for building client',
                              duration_ms: 0,
                              type: 'auth'
                         });
                         return { error: 'Your building does not have an active subscription. Please contact your property manager.' };
                    }

               } catch (error: any) {
                    await logServerAction({
                         user_id: userId,
                         action: 'NLA - Magic link failed - unexpected error during tenant validation',
                         payload: { email, tenantId: userId },
                         status: 'fail',
                         error: error.message || 'Unexpected error',
                         duration_ms: 0,
                         type: 'auth'
                    });
                    return { error: 'An unexpected error occurred. Please try again.' };
               }

          } else if (tenantError && tenantError.code !== 'PGRST116') {
               await logServerAction({
                    user_id: null,
                    action: 'NLA - Magic link tenant lookup failed',
                    payload: { email },
                    status: 'fail',
                    error: tenantError.message,
                    duration_ms: 0,
                    type: 'auth',
               });
               return { error: tenantError.message };
          }
     }

     // 4. If not found, check tblClientMembers
     if (!userFound) {
          const { data: clientMember, error: clientMemberError } = await supabase
               .from(TABLES.CLIENT_MEMBERS)
               .select('id')
               .eq('email', email)
               .single();

          if (clientMember) {
               userType = 'client';
               userId = clientMember.id;
               userFound = true;
          } else if (clientMemberError && clientMemberError.code !== 'PGRST116') {
               await logServerAction({
                    user_id: null,
                    action: 'NLA - Magic link client member lookup failed',
                    payload: { email },
                    status: 'fail',
                    error: clientMemberError.message,
                    duration_ms: 0,
                    type: 'auth',
               });
               return { error: clientMemberError.message };
          }
     }

     if (!userFound || !userId) {
          await logServerAction({
               user_id: null,
               action: 'NLA - Magic link login attempt for non-existing user',
               payload: { email },
               status: 'fail',
               error: 'User does not exist. Please sign up first.',
               duration_ms: 0,
               type: 'auth',
          });
          return { error: 'User does not exist. Please sign up first.' };
     }
     // Send magic link since the user exists
     const { data, error } = await supabase.auth.signInWithOtp({
          email,
          options: {
               emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`, // Ensure trailing slash
               shouldCreateUser: false,
          },
     });

     if (data) {
          await logServerAction({
               user_id: null,
               action: 'NLA - Magic link sent',
               payload: { email },
               status: 'success',
               error: '',
               duration_ms: 0, // Duration can be calculated if needed
               type: 'auth'
          });
     }

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'NLA - Magic link login failed',
               payload: { email },
               status: 'fail',
               error: error.message,
               duration_ms: 0, // Duration can be calculated if needed
               type: 'auth'
          })
          return { error: error.message }; // Handle other errors
     }

     // If the magic link is sent successfully, return a success message
     await logServerAction({
          user_id: null,
          action: 'NLA - Magic link sent successfully',
          payload: { emailAddress: email, ip: ipAddress },
          status: 'success',
          error: '',
          duration_ms: 0, // Duration can be calculated if needed
          type: 'auth'
     })

     return { success: true, error: '' };
}

export const handleGoogleSignIn = async (): Promise<{ success: boolean; error?: any }> => {

     const supabase = await useServerSideSupabaseAnonClient();

     // Initiate Google OAuth flow.
     const { data: authData, error: authError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          // Optionally, set a redirect URL after sign in:
          options: {
               redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`
          }
     });

     if (authError != null) {
          return { success: false, error: authError };
     } else {
          if (authData.url) {
               redirect(authData.url);
          } else {
               return { success: false, error: { message: 'Redirect URL is null.' } };
          }
     }
};

export const signInWithEmailAndPassword = async (values: SignInFormValues): Promise<{ success: boolean, error?: ErrorType, userData?: User }> => {

     const start = Date.now();
     const cookieStore = await cookies();
     const supabase = await useServerSideSupabaseServiceRoleClient();

     let userType: 'client' | 'client_member' | 'tenant' | 'admin' | null = null;
     let userId: string | null = null;
     let userFound = false;

     // 1. Check tblSuperAdmins
     const { data: admin, error: adminError } = await supabase
          .from(TABLES.SUPER_ADMINS)
          .select('id')
          .eq('email', values.email)
          .single();

     if (admin) {
          userType = 'admin';
          userId = admin.id;
          userFound = true;
          await logServerAction({
               user_id: null,
               action: 'Signing in with email and password - user found in tblSuperAdmins',
               payload: values.email,
               status: 'success',
               error: '',
               duration_ms: Date.now() - start,
               type: 'auth'
          });
     }

     // 2. If not found, check tblClients (and enforce status gate)
     if (!userFound) {
          const { data: clientRow, error: clientError } = await supabase
               .from(TABLES.CLIENTS)
               .select('id,client_status')
               .eq('email', values.email)
               .single();

          if (clientRow) {
               if (clientRow.client_status !== 'active') {
                    await logServerAction({
                         user_id: null,
                         action: 'Signing in blocked - client status not active',
                         payload: { email: values.email, status: clientRow.client_status },
                         status: 'fail',
                         error: 'Client status not active',
                         duration_ms: Date.now() - start,
                         type: 'auth'
                    });
                    return { success: false, error: { code: 'client_inactive', details: `Client status is non active`, message: 'Your account is not active. Please contact support.' } };
               }
               userType = 'client';
               userId = clientRow.id;
               userFound = true;
               await logServerAction({
                    user_id: null,
                    action: 'Signing in with email and password - active client found',
                    payload: values.email,
                    status: 'success',
                    error: '',
                    duration_ms: Date.now() - start,
                    type: 'auth'
               });
          } else if (clientError && clientError.code !== 'PGRST116') {
               await logServerAction({
                    user_id: null,
                    action: 'Signing in with email and password client lookup failed',
                    payload: values,
                    status: 'fail',
                    error: clientError.message,
                    duration_ms: Date.now() - start,
                    type: 'auth'
               });
               return { success: false, error: { code: clientError.code, details: clientError.details, hint: clientError.hint, message: clientError.message } };
          }
     }

     // 3. If not found, check tblTenants
     if (!userFound) {

          const { data: tenant, error: tenantError } = await supabase
               .from(TABLES.TENANTS)
               .select('id')
               .eq('email', values.email)
               .single();
          if (tenant) {
               userType = 'tenant';
               userId = tenant.id;
               userFound = true;

               try {
                    // Additional null check for TypeScript
                    if (!userId) {
                         await logServerAction({
                              user_id: null,
                              action: 'Signing in failed - tenant ID is null',
                              payload: { email: values.email },
                              status: 'fail',
                              error: 'Tenant ID is null',
                              duration_ms: Date.now() - start,
                              type: 'auth'
                         });
                         return { success: false, error: { code: 'invalid_tenant', details: 'Invalid tenant data', message: 'Account data is invalid. Please contact support.' } };
                    }

                    // Get client ID from tenant's building
                    const { data: customerId, success: clientIdSuccess, error: clientIdError } = await getClientIdFromTenantBuilding(userId);

                    if (!clientIdSuccess || !customerId) {
                         await logServerAction({
                              user_id: userId,
                              action: 'Signing in failed - could not get client ID from tenant building',
                              payload: { email: values.email, tenantId: userId, error: clientIdError },
                              status: 'fail',
                              error: clientIdError || 'Failed to get client ID',
                              duration_ms: Date.now() - start,
                              type: 'auth'
                         });
                         return { success: false, error: { code: 'client_lookup_failed', details: 'Could not determine building client', message: 'Unable to verify your building association. Please contact support.' } };
                    }

                    // Check client subscription status
                    const { success: subscriptionSuccess, isActive, error: subscriptionError } = await checkClientSubscriptionStatus(customerId);

                    if (!subscriptionSuccess) {
                         await logServerAction({
                              user_id: userId,
                              action: 'Signing in failed - subscription check failed',
                              payload: { email: values.email, tenantId: userId, clientId: customerId, error: subscriptionError },
                              status: 'fail',
                              error: subscriptionError || 'Subscription check failed',
                              duration_ms: Date.now() - start,
                              type: 'auth'
                         });
                         return { success: false, error: { code: 'subscription_check_failed', details: 'Could not verify subscription status', message: 'Unable to verify subscription. Please contact support.' } };
                    }

                    if (!isActive) {
                         await logServerAction({
                              user_id: userId,
                              action: 'Signing in blocked - no active subscription for tenant building',
                              payload: { email: values.email, tenantId: userId, clientId: customerId },
                              status: 'fail',
                              error: 'No active subscription found for building client',
                              duration_ms: Date.now() - start,
                              type: 'auth'
                         });
                         return { success: false, error: { code: 'no_subscription', details: 'No active subscription found for your building', message: 'Your building does not have an active subscription. Please contact your property manager.' } };
                    }

               } catch (error: any) {
                    await logServerAction({
                         user_id: userId,
                         action: 'Signing in failed - unexpected error during tenant validation',
                         payload: { email: values.email, tenantId: userId },
                         status: 'fail',
                         error: error.message || 'Unexpected error',
                         duration_ms: Date.now() - start,
                         type: 'auth'
                    });
                    return { success: false, error: { code: 'validation_error', details: 'Unexpected error during validation', message: 'An unexpected error occurred. Please try again.' } };
               }

               await logServerAction({
                    user_id: null,
                    action: 'Signing in with email and password - user found in tblTenants',
                    payload: values.email,
                    status: 'success',
                    error: '',
                    duration_ms: Date.now() - start,
                    type: 'auth'
               });
          } else if (tenantError && tenantError.code !== 'PGRST116') {
               await logServerAction({
                    user_id: null,
                    action: 'Signing in with email and password tenant lookup failed',
                    payload: values,
                    status: 'fail',
                    error: tenantError.message,
                    duration_ms: Date.now() - start,
                    type: 'auth'
               });
               return { success: false, error: { code: tenantError.code, details: tenantError.details, hint: tenantError.hint, message: tenantError.message } };
          }
     }

     // 1. Check tblClientMembers
     if (!userFound) {
          const { data: clientMember, error: clientMemberError } = await supabase
               .from(TABLES.CLIENT_MEMBERS)
               .select('id')
               .eq('email', values.email)
               .single();
          if (clientMember) {

               const { success, data } = await readClientFromClientMemberID(clientMember?.id!);

               // Check if client has an active subscription
               const { data: subscriptionData, error: subscriptionError } = await supabase
                    .from(TABLES.CLIENT_SUBSCRIPTION)
                    .select('*')
                    .eq('customerId', data?.id)
                    .in('status', ['active', 'trialing'])
                    .single();

               if (subscriptionError || !subscriptionData) {
                    supabase.auth.signOut();
                    // Remove cookies
                    cookieStore.getAll().forEach(cookie => cookieStore.delete(cookie.name));
                    await logServerAction({
                         user_id: null,
                         action: 'Signing in with email and password - no active subscription found',
                         payload: values,
                         status: 'fail',
                         error: subscriptionError ? subscriptionError.message : 'No active subscription found',
                         duration_ms: Date.now() - start,
                         type: 'auth'
                    });
                    return { success: false, error: { code: 'no_subscription', details: 'No active subscription found', message: 'No active subscription found. Please subscribe to continue.' } };
               }
               userType = 'client_member';
               userId = clientMember.id;
               userFound = true;
               await logServerAction({
                    user_id: null,
                    action: 'Signing in with email and password - user found in tblClientMembers',
                    payload: values.email,
                    status: 'success',
                    error: '',
                    duration_ms: Date.now() - start,
                    type: 'auth'
               });
          } else if (clientMemberError && clientMemberError.code !== 'PGRST116') {
               await logServerAction({
                    user_id: null,
                    action: 'Signing in with email and password client member lookup failed',
                    payload: values,
                    status: 'fail',
                    error: clientMemberError.message,
                    duration_ms: Date.now() - start,
                    type: 'auth'
               });
               return { success: false, error: { code: clientMemberError.code, details: clientMemberError.details, hint: clientMemberError.hint, message: clientMemberError.message } };
          }
     }

     if (!userFound || !userId) {
          await logServerAction({
               user_id: null,
               action: 'Signing in with email and password failed',
               payload: values,
               status: 'fail',
               error: 'User does not exist',
               duration_ms: Date.now() - start,
               type: 'auth'
          });
          return { success: false, error: { code: 'PGRST116', details: 'User does not exist', hint: 'Please try registering first', message: 'Invalid credentials' } };
     }

     if (userType === 'client') {
          // Check if client has an active subscription
          const { data: subscriptionData, error: subscriptionError } = await supabase
               .from(TABLES.CLIENT_SUBSCRIPTION)
               .select('*')
               .eq('customerId', userId)
               .in('status', ['active', 'trialing'])
               .single();

          if (subscriptionError || !subscriptionData) {
               supabase.auth.signOut();
               // Remove cookies
               cookieStore.getAll().forEach(cookie => cookieStore.delete(cookie.name));
               await logServerAction({
                    user_id: null,
                    action: 'Signing in with email and password - no active subscription found',
                    payload: values,
                    status: 'fail',
                    error: subscriptionError ? subscriptionError.message : 'No active subscription found',
                    duration_ms: Date.now() - start,
                    type: 'auth'
               });
               return { success: false, error: { code: 'no_subscription', details: 'No active subscription found', message: 'No active subscription found. Please subscribe to continue.' } };
          }
     }

     const { data: signInSession, error: signInError } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
     });

     if (signInError) {
          await logServerAction({
               user_id: null,
               action: 'User found but signing in with email and password failed',
               payload: values,
               status: 'fail',
               error: signInError.message,
               duration_ms: Date.now() - start,
               type: 'db'
          });
          return { success: false, error: { code: signInError.code!, details: signInError.message } };
     }

     await logServerAction({
          created_at: new Date(),
          user_id: signInSession.user.id,
          action: 'Signed in with email and password',
          payload: values,
          status: 'success',
          error: '',
          duration_ms: Date.now() - start,
          type: 'auth'
     });
     return { success: true, userData: signInSession.user };
}

export const logout = async (): Promise<{ success: boolean; error?: string }> => {
     const cookieStore = await cookies();
     const startedAt = Date.now();

     const supabase = await useServerSideSupabaseAnonClient();
     const { error } = await supabase.auth.signOut();

     // ✅ ALWAYS nuke auth cookies on our side:
     AUTH_COOKIES.forEach((name) => {
          try {
               // Next 13+/14+ API
               // @ts-ignore in case .delete is not typed in your version
               cookieStore.delete?.(name);
          } catch {
               // Fallback for older versions – overwrite & expire
               cookieStore.set(name, '', { maxAge: 0, path: '/' });
          }
     });

     if (error) {
          // Log the error, but from UI perspective, user is still logged out
          await logServerAction({
               user_id: null,
               action: 'NLA - Logout failed (forced cookie clear)',
               payload: {},
               status: 'fail',
               error: error.message,
               duration_ms: Date.now() - startedAt,
               type: 'auth',
          });
          // Important: still return success: true so UI behaves like "logged out"
          return { success: true, error: error.message };
     }

     return { success: true };
};