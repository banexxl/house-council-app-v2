import { createBrowserClient } from '@supabase/ssr'

const useServerSideSupabaseServiceRoleClient = () => {
     return createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
     )
}

export const supabase = useServerSideSupabaseServiceRoleClient()