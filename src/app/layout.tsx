'use client'

import { type ReactNode } from 'react';
import { NProgress } from 'src/components/nprogress';
import { Layout as RootLayout } from 'src/layouts/root';
import 'src/global.css';


interface LayoutProps {
  children: ReactNode;
}

const Layout = (props: LayoutProps) => {

  const { children } = props;

  // Realtime subscriptions moved to dashboard layout so auth pages don't subscribe.

  return (
    <html>
      <body>
        <RootLayout >
          {children}
          <NProgress />
        </RootLayout>
      </body>
    </html >
  );
};

export default Layout;
