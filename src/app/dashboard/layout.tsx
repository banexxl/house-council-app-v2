// src/app/dashboard/layout.tsx (Server or Client wrapper + Client inner layout)

import { Suspense, type ReactNode } from 'react';
import { NProgress } from 'src/components/nprogress';
import { Layout as RootLayout } from 'src/layouts/root'; // likely a client component
import { Layout as DashboardLayoutRoot } from 'src/layouts/components/dashboard';
import ClientSubscriptionWatcher from 'src/realtime/client-subscription-watcher';
import { DefaultPageSkeleton } from 'src/sections/dashboard/skeletons/default-page-skeleton';
import { getViewer } from 'src/libs/supabase/server-auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: ReactNode }) {

     const { client, tenant, admin, clientMember } = await getViewer();

     if (!client && !tenant && !admin && !clientMember) {
          redirect('/auth/login');
     }

     return (
          <RootLayout>
               <DashboardLayoutRoot>
                    <Suspense fallback={<DefaultPageSkeleton />}>
                         {children}
                    </Suspense>
               </DashboardLayoutRoot>
               <ClientSubscriptionWatcher />
               <NProgress />
          </RootLayout>
     );
}
