'use server';

import { checkUserExists } from 'src/libs/supabase/tbl-auth-users';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { readClientByEmailAction } from '../actions/client-actions/client-actions';
import { verifyPassword } from 'src/utils/bcrypt';

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
     console.log('Google authData', authData);
     console.log('Google authError', authError);

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

export const signInWithEmailAndPassword = async (email: string, password: string) => {
     const supabase = await useServerSideSupabaseClient();

     // Fetch the user from your database (including hashed password)
     const { getClientByEmailActionSuccess, getClientByEmailActionData: user } = await readClientByEmailAction(email);
     if (!user || !user.password) {
          return { error: "Invalid email or password!" };
     }
     console.log('usao u signInWithEmailAndPassword', user);

     // Compare the provided password with the stored hash
     const isPasswordValid = await verifyPassword(password, user.password);
     console.log('isPasswordValid', isPasswordValid);

     if (!isPasswordValid) {
          return { error: "Invalid email or password!" };
     }

     // If the password is correct, sign in the user via Supabase authentication
     const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password, // Note: Supabase expects a password here, but you're already verifying it manually
     });
     console.log('aaaaaaaaaaa', data);
     console.log('aaaaaaaaaaa', error);


     if (error) {
          return { error: error.message };
     }

     return { success: true, user: data.user };
};
