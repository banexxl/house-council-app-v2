// components/AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserDataCombined } from 'src/libs/supabase/server-auth';
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';

const AuthCtx = createContext<UserDataCombined>({ admin: null, client: null, tenant: null, userData: null, clientMember: null, error: undefined });

export default function AuthProvider({
     initialViewer,
     children,
}: { initialViewer: UserDataCombined; children: React.ReactNode }) {
     const router = useRouter();

     // Subscribe once; on login/logout, refresh the tree (server fetches fresh viewer)
     useEffect(() => {
          // Guard just in case (should only run client-side)
          if (!supabaseBrowserClient) return;
          const { data: sub } = supabaseBrowserClient.auth.onAuthStateChange(() => {
               // Defer refresh to next tick to avoid sync render issues
               setTimeout(() => router.refresh(), 0);
          });
          return () => {
               try { sub.subscription.unsubscribe(); } catch { /* noop */ }
          };
     }, [router]);

     return <AuthCtx.Provider value={initialViewer}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
