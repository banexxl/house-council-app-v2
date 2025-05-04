'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const useServerSideSupabaseServiceRoleClient = async () => {
     const cookieStore = await cookies();

     return createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
               cookies: {
                    getAll: () => cookieStore.getAll(),
                    setAll: (cookiesToSet) => {
                         cookiesToSet.forEach(({ name, value, options }) => {
                              cookieStore.set(name, value, options);
                         });
                    },
               },
          }
     );
}
