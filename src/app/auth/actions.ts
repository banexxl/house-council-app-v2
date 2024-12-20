'use server'

import { createClient } from 'src/libs/supabase/server';
import { checkUserExists } from 'src/libs/supabase/tbl-auth-users';
import { redirect } from 'next/navigation'

export async function login(email: string) {
     const userExists = await checkUserExists(email);

     if (!userExists) {
          return { error: 'User does not exist. Please sign up first.' };
     }
     const supabase = await createClient();


     // Send magic link since the user exists
     const { data, error } = await supabase.auth.signInWithOtp({
          email,
          options: {
               emailRedirectTo: process.env.BASE_URL + 'auth/callback',
          },
     });

     if (error) {
          return { error: error.message }; // Handle other errors
     }

     return { success: 'Check your email for the login link!' };
}

export async function logout() {
     const supabase = await createClient();
     await supabase.auth.signOut()
     redirect('/')
}