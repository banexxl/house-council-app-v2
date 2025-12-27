'use client';

import { Suspense, type ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from 'src/contexts/auth';
import { FeatureAccessProvider } from 'src/contexts/feature-access';
import { isFeatureAllowed } from 'src/config/feature-access';

import { NProgress } from 'src/components/nprogress';
import { Layout as DashboardLayoutRoot } from 'src/layouts/components/dashboard';
import ClientSubscriptionWatcher from 'src/realtime/client-subscription-watcher';
import { DefaultPageSkeleton } from 'src/sections/dashboard/skeletons/default-page-skeleton';

type Props = { children: ReactNode };

export default function DashboardClientLayout({ children }: Props) {
     const { status, refresh, viewer } = useAuth();
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

     // Feature gate per-route based on subscription features (clients/tenants)
     useEffect(() => {
          if (!viewer || viewer.admin) return;
          const hasFeatureData = Array.isArray(viewer.allowedFeatureSlugs);
          const allowed = new Set<string>((viewer.allowedFeatureSlugs || []).map((s: string) => s.toLowerCase()));
          if (!hasFeatureData) return;

          const guards: { feature: string; match: RegExp }[] = [
               { feature: 'locations', match: /^\/dashboard\/locations/ },
               { feature: 'buildings', match: /^\/dashboard\/buildings/ },
               { feature: 'apartments', match: /^\/dashboard\/apartments/ },
               { feature: 'tenants', match: /^\/dashboard\/tenants/ },
               { feature: 'announcements', match: /^\/dashboard\/announcements/ },
               { feature: 'calendar', match: /^\/dashboard\/calendar/ },
               { feature: 'polls', match: /^\/dashboard\/polls/ },
               { feature: 'file-manager', match: /^\/dashboard\/file-manager/ },
               { feature: 'service-requests', match: /^\/dashboard\/service-requests/ },
               { feature: 'social', match: /^\/dashboard\/social/ },
          ];

          const hit = guards.find((g) => g.match.test(pathname));
          if (hit && !isFeatureAllowed(hit.feature, allowed)) {
               router.replace('/dashboard');
          }
     }, [viewer, pathname, router]);

     if (status === 'loading') return <DefaultPageSkeleton />;
     if (status === 'unauthenticated') return null;

     return (
          <>
               <FeatureAccessProvider
                    features={viewer?.allowedFeatures}
                    featureSlugs={viewer?.allowedFeatureSlugs}
               >
                    <DashboardLayoutRoot>
                         <Suspense fallback={<DefaultPageSkeleton />}>{children}</Suspense>
                    </DashboardLayoutRoot>
               </FeatureAccessProvider>

               <ClientSubscriptionWatcher />
               <NProgress />
          </>
     );
}
