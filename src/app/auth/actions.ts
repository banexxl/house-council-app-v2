'use server';

import { readClientByEmailAction } from '../actions/client/client-actions';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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

export const checkIfUserExistsAndGetRole = async (email: string): Promise<{ exists: boolean; error?: string; role?: string }> => {

     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase
          .from('tblClients')
          .select('email, role')
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

          return { exists: false, error: error.message };
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
          return { exists: false, error: 'User does not exist' };
     }

     return { exists: true, role: data.role };
}

export const magicLinkLogin = async (email: string): Promise<{ success?: boolean, error?: string }> => {

     const cookieStore = await cookies();

     const supabase = await useServerSideSupabaseAnonClient();

     //Get client id from email
     const { getClientByEmailActionData } = await readClientByEmailAction(email);

     if (!getClientByEmailActionData) {
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

     // Check if client has an active subscription
     const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('tblClient_Subscription')
          .select('*')
          .eq('client_id', getClientByEmailActionData.id)
          .single();

     if (subscriptionError || !subscriptionData) {
          supabase.auth.signOut();
          // Remove cookies
          cookieStore.getAll().forEach(cookie => cookieStore.delete(cookie.name));

          return { success: false, error: 'No active subscription found. Please subscribe to continue.' };
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
     const supabase = await useServerSideSupabaseAnonClient();

     // Check if the user exists in tblClients
     const { data, error } = await supabase
          .from('tblClients')
          .select('email, id',)
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
                    return { success: false, error: { code: error.code, details: error.details, hint: 'Please try registering first', message: 'Invalid credentials' } };
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
                    return { success: false, error: { code: error.code, details: error.details, hint: 'Please try resetting your password', message: 'Invalid credentials' } };
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

     // Check if client has an active subscription
     const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('tblClient_Subscription')
          .select('*')
          .eq('client_id', data.id)
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
          })
          return { success: false, error: { code: 'no_subscription', details: 'No active subscription found', message: 'No active subscription found. Please subscribe to continue.' } };
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


export const logout = async () => {
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
