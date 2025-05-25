'use server';

import { checkUserExists } from 'src/libs/supabase/tbl-auth-users';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { readClientByEmailAction } from '../actions/client-actions/client-actions';
import { verifyPassword } from 'src/utils/bcrypt';
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
     const userExists = await checkUserExists(email);

     if (!userExists) {
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

     if (error) {
          return { error: error.message }; // Handle other errors
     }

     return { success: 'Check your email for the login link!' };
}

export async function logout() {

     const supabase = await useServerSideSupabaseClient();

     await supabase.auth.signOut();
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
          },
     });

     if (!authError == null) {
          console.error('Error during Google sign in:', authError);
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
