// components/AuthProvider.tsx
'use client';

import { createContext, useContext, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { UserDataCombined } from 'src/libs/supabase/server-auth';

const AuthCtx = createContext<UserDataCombined>({ admin: null, client: null, tenant: null, userData: null, clientMember: null, error: undefined });

export default function AuthProvider({
     initialViewer,
     children,
}: { initialViewer: UserDataCombined; children: React.ReactNode }) {
     const router = useRouter();

     const supabase = useMemo(
          () =>
               createBrowserClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
               ),
          []
     );

     // Subscribe once; on login/logout, refresh the tree (server fetches fresh viewer)
     useEffect(() => {
          // Guard just in case (should only run client-side)
          if (!supabase) return;
          const { data: sub } = supabase.auth.onAuthStateChange(() => {
               // Defer refresh to next tick to avoid sync render issues
               setTimeout(() => router.refresh(), 0);
          });
          return () => {
               try { sub.subscription.unsubscribe(); } catch { /* noop */ }
          };
     }, [supabase, router]);

     return <AuthCtx.Provider value={initialViewer}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
