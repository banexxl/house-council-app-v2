'use server';

import { checkUserExists } from 'src/libs/supabase/tbl-auth-users';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function login(email: string) {
     // Use the server-side Supabase client
     const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
               cookies: {
                    getAll: async () => (await cookies()).getAll(),
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

     console.log('data', data);
     console.log('error', error);

     if (error) {
          return { error: error.message }; // Handle other errors
     }

     return { success: 'Check your email for the login link!' };
}

export async function logout() {
     // Use the server-side Supabase client
     const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
               cookies: {
                    getAll: async () => (await cookies()).getAll(),
               },
          }
     );

     await supabase.auth.signOut();
     redirect('/');
}