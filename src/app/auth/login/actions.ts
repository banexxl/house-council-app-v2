'use server'

import { createClient } from 'src/libs/supabase/server'

export async function login(email: string) {

     const supabase = await createClient()

     const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
               emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          },
     })

     if (error) {
          return { error: error.message }
     }

     return { success: 'Check your email for the login link!' }
}

