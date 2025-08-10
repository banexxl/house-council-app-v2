'use server';

import { logServerAction } from 'src/libs/supabase/server-logging';
import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export type SignInFormValues = {
     email: string;
     password: string;
};

export type ErrorType = {
     code: string;
     details: string;
     hint?: string;
     message?: string;
}

export const magicLinkLogin = async (email: string): Promise<{ success?: boolean, error?: string }> => {

     const supabase = await useServerSideSupabaseServiceRoleClient();

     // Check tblSuperAdmins, tblClients, tblTenants for user existence
     let userType: 'client' | 'tenant' | 'admin' | null = null;
     let userId: string | null = null;
     let userFound = false;

     // 1. Check tblSuperAdmins
     const { data: admin, error: adminError } = await supabase
          .from('tblSuperAdmins')
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
               .from('tblClients')
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
               .from('tblTenants')
               .select('id')
               .eq('email', email)
               .single();

          if (tenant) {
               userType = 'tenant';
               userId = tenant.id;
               userFound = true;
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
               emailRedirectTo: `${process.env.BASE_URL}/auth/callback`, // Ensure trailing slash
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
          payload: { email },
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
               redirectTo: `${process.env.BASE_URL}/auth/callback`
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

export const signInWithEmailAndPassword = async (values: SignInFormValues): Promise<{ success: boolean, error?: ErrorType }> => {

     const start = Date.now();
     const cookieStore = await cookies();
     const supabase = await useServerSideSupabaseServiceRoleClient();

     let userType: 'client' | 'tenant' | 'admin' | null = null;
     let userId: string | null = null;
     let userFound = false;

     // 1. Check tblSuperAdmins
     const { data: admin, error: adminError } = await supabase
          .from('tblSuperAdmins')
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
               payload: JSON.stringify(values),
               status: 'success',
               error: '',
               duration_ms: Date.now() - start,
               type: 'auth'
          });
     }

     // 2. If not found, check tblClients
     if (!userFound) {
          const { data: client, error: clientError } = await supabase
               .from('tblClients')
               .select('id')
               .eq('email', values.email)
               .single();
          if (client) {
               userType = 'client';
               userId = client.id;
               userFound = true;
               await logServerAction({
                    user_id: null,
                    action: 'Signing in with email and password - user found in tblClients',
                    payload: JSON.stringify(values),
                    status: 'success',
                    error: '',
                    duration_ms: Date.now() - start,
                    type: 'auth'
               });
          } else if (clientError && clientError.code !== 'PGRST116') {
               await logServerAction({
                    user_id: null,
                    action: 'Signing in with email and password client lookup failed',
                    payload: JSON.stringify(values),
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
               .from('tblTenants')
               .select('id')
               .eq('email', values.email)
               .single();
          if (tenant) {
               userType = 'tenant';
               userId = tenant.id;
               userFound = true;
               await logServerAction({
                    user_id: null,
                    action: 'Signing in with email and password - user found in tblTenants',
                    payload: JSON.stringify(values),
                    status: 'success',
                    error: '',
                    duration_ms: Date.now() - start,
                    type: 'auth'
               });
          } else if (tenantError && tenantError.code !== 'PGRST116') {
               await logServerAction({
                    user_id: null,
                    action: 'Signing in with email and password tenant lookup failed',
                    payload: JSON.stringify(values),
                    status: 'fail',
                    error: tenantError.message,
                    duration_ms: Date.now() - start,
                    type: 'auth'
               });
               return { success: false, error: { code: tenantError.code, details: tenantError.details, hint: tenantError.hint, message: tenantError.message } };
          }
     }

     if (!userFound || !userId) {
          await logServerAction({
               user_id: null,
               action: 'Signing in with email and password failed',
               payload: JSON.stringify(values),
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
               .from('tblClient_Subscription')
               .select('*')
               .eq('client_id', userId)
               .single();

          if (subscriptionError || !subscriptionData) {
               supabase.auth.signOut();
               // Remove cookies
               cookieStore.getAll().forEach(cookie => cookieStore.delete(cookie.name));
               await logServerAction({
                    user_id: null,
                    action: 'Signing in with email and password - no active subscription found',
                    payload: JSON.stringify(values),
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
               payload: JSON.stringify(values),
               status: 'fail',
               error: signInError.message,
               duration_ms: Date.now() - start,
               type: 'db'
          });
          return { success: false, error: { code: signInError.code!, details: signInError.message } };
     }

     await logServerAction({
          user_id: signInSession.user.id,
          action: 'Signed in with email and password',
          payload: JSON.stringify(values),
          status: 'success',
          error: '',
          duration_ms: Date.now() - start,
          type: 'auth'
     });
     return { success: true };
}

export const logout = async (): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const { error } = await supabase.auth.signOut();

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'NLA - Logout failed',
               payload: {},
               status: 'fail',
               error: error.message,
               duration_ms: 0,
               type: 'auth',
          });
          return { success: false, error: error.message };
     }

     return { success: true };
};
