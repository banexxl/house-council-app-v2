'use server'

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// SUPABASE_ANON_KEY - Used for public / authenticated users.Respects user session, can refresh tokens, limited to Row Level Security(RLS).
// SUPABASE_SERVICE_ROLE_KEY - Admin - level access.Ignores sessions, bypasses RLS.Not for user - facing logic.Use only in trusted backends like cron jobs or admin tools.

export const useServerSideSupabaseAnonClient = async () => {
     // Use the server-side Supabase client
     const cookieStore = await cookies();
     const supabase = createServerClient(
          process.env.SUPABASE_URL!,
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