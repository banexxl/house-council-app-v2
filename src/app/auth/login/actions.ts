'use server'

import { createClient } from 'src/libs/supabase/server'

export async function login(email: string) {
     const supabase = await createClient();

     const redirectUrl = process.env.BASE_URL + 'auth/callback';
     console.log('Redirect URL:', redirectUrl); // Log the redirect URL

     const { data, error } = await supabase.auth.signInWithOtp({
          email,
          options: {
               emailRedirectTo: redirectUrl,
          },
     });

     console.log('data', data);

     if (error) {
          return { error: error.message };
     }

     return { success: 'Check your email for the login link!' };

}

