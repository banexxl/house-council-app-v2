'use server'

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// SUPABASE_ANON_KEY - Used for public / authenticated users.Respects user session, can refresh tokens, limited to Row Level Security(RLS).
// SB_SERVICE_KEY - Admin - level access.Ignores sessions, bypasses RLS.Not for user - facing logic.Use only in trusted backends like cron jobs or admin tools.

export const useServerSideSupabaseAnonClient = async () => {
     // Use the server-side Supabase client
     const cookieStore = await cookies();
     const supabase = createServerClient(
          process.env.SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SB_CLIENT_KEY!,
          {
               cookies: {
                    getAll: () => cookieStore.getAll(),
                    setAll: (cookiesToSet: any) => {
                         cookiesToSet.forEach(({ name, value, options }: any) => {
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

export const useServerSideSupabaseServiceRoleClient = async () => {
     // Use the server-side Supabase client
     const cookieStore = await cookies();
     const supabase = createServerClient(
          process.env.SUPABASE_URL!,
          process.env.SB_SERVICE_KEY!,
          {
               cookies: {
                    getAll: () => cookieStore.getAll(),
                    setAll: (cookiesToSet: any) => {
                         cookiesToSet.forEach(({ name, value, options }: any) => {
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

export const useServerSideSupabaseServiceRoleAdminClient = async () => {
     const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SB_SERVICE_KEY!,
          {
               auth: {
                    autoRefreshToken: false,
                    persistSession: false,
               },
          }
     );

     return supabase
}
