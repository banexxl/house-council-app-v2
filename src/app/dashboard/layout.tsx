import { Suspense, type ReactNode } from 'react';
import { DefaultPageSkeleton } from 'src/sections/dashboard/skeletons/default-page-skeleton';
import { Layout as DashboardLayout } from 'src/layouts/components/dashboard';

export default function Layout({ children }: { children: ReactNode }) {
     return (
          <Suspense fallback={<DefaultPageSkeleton />}>
               <DashboardLayout>{children}</DashboardLayout>
          </Suspense>
     );
}
