import { type ReactNode } from 'react';
import { NProgress } from 'src/components/nprogress';
import { Layout as RootLayout } from 'src/layouts/root';
import AuthProvider from 'src/contexts/auth/auth-provider';
import { getViewer } from 'src/libs/supabase/server-auth';
import ClientSubscriptionWatcher from 'src/realtime/client-subscription-watcher';

export default async function Layout({ children }: { children: React.ReactNode }) {

  const viewer = await getViewer();
  // Realtime subscriptions moved to dashboard layout so auth pages don't subscribe.

  return (
    <html>
      <body>
        <AuthProvider initialViewer={viewer}>
          <RootLayout >
            {children}
            {/* Client-side realtime watcher: logout on non-active subscription */}
            <ClientSubscriptionWatcher />
            <NProgress />
          </RootLayout>
        </AuthProvider>
      </body>
    </html >
  );
};