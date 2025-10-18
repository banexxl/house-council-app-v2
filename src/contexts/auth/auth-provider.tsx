'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserDataCombined } from 'src/libs/supabase/server-auth';
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';
import log from 'src/utils/logger';

const AuthCtx = createContext<UserDataCombined>({
     admin: null, client: null, tenant: null, userData: null, clientMember: null, error: undefined
});

export default function AuthProvider({ initialViewer, children }: {
     initialViewer: UserDataCombined; children: React.ReactNode
}) {
     const router = useRouter();

     useEffect(() => {
          if (!supabaseBrowserClient) return;

          const { data: { subscription } } = supabaseBrowserClient.auth.onAuthStateChange((event) => {
               // Only react to actual auth boundary changes
               if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                    log(`Auth state changed: ${event}`);
                    // Defer to next tick to avoid sync render conflicts
                    setTimeout(() => router.refresh(), 0);
               }
               // Ignore: 'TOKEN_REFRESHED', 'INITIAL_SESSION', 'USER_UPDATED', 'PASSWORD_RECOVERY'
          });

          return () => subscription.unsubscribe();
     }, [router]);

     return <AuthCtx.Provider value={initialViewer}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
