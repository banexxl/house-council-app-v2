'use client';

import { Suspense, type ReactNode } from 'react';
import { NProgress } from 'src/components/nprogress';
import { Layout as RootLayout } from 'src/layouts/root';
import { Layout as DashboardLayoutRoot } from 'src/layouts/components/dashboard';
import ClientSubscriptionWatcher from 'src/realtime/client-subscription-watcher';
import { DefaultPageSkeleton } from 'src/sections/dashboard/skeletons/default-page-skeleton';

type Props = {
     children: ReactNode;
};

export default function DashboardClientLayout({ children }: Props) {
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
