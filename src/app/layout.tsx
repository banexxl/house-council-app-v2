import type { ReactNode } from 'react';
import type { Metadata } from 'next';

import 'src/global.css';

import { NProgress } from 'src/components/nprogress';
import { Layout as RootLayout } from 'src/layouts/root';
// Force-Dynamic is required otherwise all pages are marked as client-side
// due to the usage of the "cookies" function.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'House Council App',
  // viewport: 'initial-scale=1, width=device-width', izaziva warning na serveru
  icons: {
    icon: [
      { rel: 'icon', url: '/favicon.ico', type: 'image/x-icon' },
      { rel: 'icon', url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { rel: 'icon', url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: {
      rel: 'apple-touch-icon.png',
      url: '/apple-touch-icon.png',
      type: 'image/png',
      sizes: '180x180',
    },
  },
};

interface LayoutProps {
  children: ReactNode;
}

const Layout = async (props: LayoutProps) => {
  const { children } = props;

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
