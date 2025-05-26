'use server';

import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { readClientByEmailAction } from '../actions/client-actions/client-actions';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/ss-supabase-service-role-client';

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

export const checkIfUserExists = async (email: string): Promise<boolean> => {
     const supabase = await useServerSideSupabaseClient();
     const { data, error } = await supabase
          .from('tblClients')
          .select('email')
          .eq('email', email)
          .single();

     if (data) {
          logServerAction({
               user_id: null,
               action: 'NLA - Checking if user exists',
               payload: { email },
               status: 'success',
               error: '',
               duration_ms: 0, // Duration can be calculated if needed
               type: 'auth'
          })
     }

     if (error) {

          logServerAction({
               user_id: null,
               action: 'NLA - Checking if user exists failed',
               payload: { email },
               status: 'fail',
               error: error.message,
               duration_ms: 0, // Duration can be calculated if needed
               type: 'auth'
          })

          return false;
     }

     // If data is returned, the user exists
     if (!data) {
          logServerAction({
               user_id: null,
               action: 'NLA - Checking if user exists returned no data',
               payload: { email },
               status: 'fail',
               error: 'User does not exist',
               duration_ms: 0, // Duration can be calculated if needed
               type: 'auth'
          })
          return false;
     }

     return !!data;
}

export const useServerSideSupabaseClient = async () => {
     // Use the server-side Supabase client
     const cookieStore = await cookies();
     const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
               cookies: {
                    getAll: () => cookieStore.getAll(),
                    setAll: (cookiesToSet) => {
                         cookiesToSet.forEach(({ name, value, options }) => {
                              try {
                                   cookieStore.set(name, value, options);
                              } catch {
                                   // Handle cases where setting cookies in server actions isn't supported
                              }
                         });
                    },
               },
          }
     );

     return supabase
}

export async function magicLinkLogin(email: string) {

     const supabase = await useServerSideSupabaseClient();
     // Check if the user exists
     const userExists = await checkIfUserExists(email);

     if (!userExists) {
          await logServerAction({
               user_id: null,
               action: 'NLA - Magic link login attempt for non-existing user',
               payload: { email },
               status: 'fail',
               error: 'User does not exist. Please sign up first.',
               duration_ms: 0, // Duration can be calculated if needed
               type: 'auth'
          })
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

     return { success: 'Check your email for the login link!' };
}

export async function logout() {

     const supabase = await useServerSideSupabaseClient();

     const { error } = await supabase.auth.signOut();

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'NLA - Logout failed',
               payload: {},
               status: 'fail',
               error: error.message,
               duration_ms: 0, // Duration can be calculated if needed
               type: 'auth'
          })
          return { success: false, error: error.message };
     }
     redirect('/auth/login');
}

export const handleGoogleSignIn = async (): Promise<{ success: boolean; error?: any }> => {

     const supabase = await useServerSideSupabaseClient();

     // Initiate Google OAuth flow.
     const { data: authData, error: authError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          // Optionally, set a redirect URL after sign in:
          options: {
               redirectTo: `${process.env.BASE_URL}/auth/callback`
          }
     });

     if (!authError == null) {
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
     console.log('values', values);

     const start = Date.now();

     const supabase = await useServerSideSupabaseServiceRoleClient();

     const { data, error } = await supabase
          .from('tblClients')
          .select('email')
          .eq('email', values.email)
          .single();

     if (data) {
          await logServerAction({
               user_id: null,
               action: 'Signing in with email and password - user found in tblClients',
               payload: JSON.stringify(values),
               status: 'success',
               error: '',
               duration_ms: Date.now() - start,
               type: 'auth'
          })
     }

     if (error) {
          switch (error.code) {
               case 'PGRST116':
                    await logServerAction({
                         user_id: null,
                         action: 'Signing in with email and password failed',
                         payload: JSON.stringify(values),
                         status: 'fail',
                         error: error.message,
                         duration_ms: Date.now() - start,
                         type: 'auth'
                    })
                    return { success: false, error: { code: error.code, details: error.details, hint: 'Please try registering first', message: 'Email not found' } };
               case 'PGRS003':
                    await logServerAction({
                         user_id: null,
                         action: 'Signing in with email and password failed',
                         payload: JSON.stringify(values),
                         status: 'fail',
                         error: error.message,
                         duration_ms: Date.now() - start,
                         type: 'auth'
                    })
                    return { success: false, error: { code: error.code, details: error.details, hint: 'Please try resetting your password', message: 'Password is incorrect' } };
               default:
                    await logServerAction({
                         user_id: null,
                         action: 'Signing in with email and password failed',
                         payload: JSON.stringify(values),
                         status: 'fail',
                         error: error.message,
                         duration_ms: Date.now() - start,
                         type: 'auth'
                    })
                    return { success: false, error: { code: error.code, details: error.details, hint: error.hint, message: error.message } };
          }
     }

     const { data: signInSession, error: signInError } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
     });

     if (signInError) {
          await logServerAction({
               user_id: null,
               action: 'User with valid password found in tblClients but signing in with email and password failed',
               payload: JSON.stringify(values),
               status: 'fail',
               error: signInError.message,
               duration_ms: Date.now() - start,
               type: 'db'
          })
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
     })
     return { success: true };
}
