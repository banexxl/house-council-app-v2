'use client';

import { Suspense, type ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from 'src/contexts/auth';

import { NProgress } from 'src/components/nprogress';
import { Layout as DashboardLayoutRoot } from 'src/layouts/components/dashboard';
import ClientSubscriptionWatcher from 'src/realtime/client-subscription-watcher';
import { DefaultPageSkeleton } from 'src/sections/dashboard/skeletons/default-page-skeleton';

type Props = { children: ReactNode };

export default function DashboardClientLayout({ children }: Props) {
     const { status, refresh } = useAuth();
     const router = useRouter();
     const pathname = usePathname();

     useEffect(() => {
          refresh();

          const onFocus = () => refresh();
          const onPageShow = () => refresh();

          window.addEventListener('focus', onFocus);
          window.addEventListener('pageshow', onPageShow);

          const onVis = () => {
               if (document.visibilityState === 'visible') refresh();
          };
          document.addEventListener('visibilitychange', onVis);

          return () => {
               window.removeEventListener('focus', onFocus);
               window.removeEventListener('pageshow', onPageShow);
               document.removeEventListener('visibilitychange', onVis);
          };
     }, [refresh]);

     useEffect(() => {
          if (status === 'unauthenticated') {
               const login = new URL('/auth/login', window.location.origin);
               login.searchParams.set('redirect', pathname);
               router.replace(login.pathname + login.search);
          }
     }, [status, router, pathname]);

     if (status === 'loading') return <DefaultPageSkeleton />;
     if (status === 'unauthenticated') return null;

     return (
          <>
               <DashboardLayoutRoot>
                    <Suspense fallback={<DefaultPageSkeleton />}>{children}</Suspense>
               </DashboardLayoutRoot>

               <ClientSubscriptionWatcher />
               <NProgress />
          </>
     );
}
