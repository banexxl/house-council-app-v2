'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from 'src/contexts/auth';
import { Layout as RootAppProviders } from 'src/layouts/root';

export default function Providers({ children }: { children: ReactNode }) {
     return (
          <RootAppProviders>
               <AuthProvider>
                    {children}
               </AuthProvider>
          </RootAppProviders>
     );
}
