import { type ReactNode } from 'react';
import { NProgress } from 'src/components/nprogress';
import { Layout as RootLayout } from 'src/layouts/root';
import 'src/global.css';
import AuthProvider from 'src/contexts/auth/auth-provider';
import { getViewer } from 'src/libs/supabase/server-auth';


interface LayoutProps {
  children: ReactNode;
}

export const dynamic = 'force-dynamic';

export default async function Layout({ children }: { children: React.ReactNode }) {

  const viewer = await getViewer();
  // Realtime subscriptions moved to dashboard layout so auth pages don't subscribe.

  return (
    <html>
      <body>
        <AuthProvider initialViewer={viewer}>
          <RootLayout >
            {children}
            <NProgress />
          </RootLayout>
        </AuthProvider>
      </body>
    </html >
  );
};

