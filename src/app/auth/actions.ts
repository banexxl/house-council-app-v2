'use server';

import { checkUserExists } from 'src/libs/supabase/tbl-auth-users';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function magicLinkLogin(email: string) {

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

     await supabase.auth.signOut();
     redirect('/auth/login');
}

export const loginWithGoogle = async () => {

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

     const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
               redirectTo: `${process.env.BASE_URL}/auth/callback/`
          }
     })



     if (error) {
          return { error: error.message }; // Handle other errors
     }

     if (data.url) {
          redirect(data.url);
     }

     return { success: true }

}
