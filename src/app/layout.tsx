import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import 'src/global.css';

import { NProgress } from 'src/components/nprogress';
import { Layout as RootLayout } from 'src/layouts/root';
import type { Settings } from 'src/types/settings';
import { createClient } from 'src/libs/supabase/server';
import { redirect } from 'next/navigation';

// Force-Dynamic is required otherwise all pages are marked as client-side
// due to the usage of the "cookies" function.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Devias Kit PRO',
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

const SETTINGS_STORAGE_KEY = 'app.settings';

const restoreSettings = (): Settings | undefined => {
  const cookieList = cookies();

  let value: Settings | undefined;

  // if (cookieList.has(SETTINGS_STORAGE_KEY)) {
  //   try {
  //     const restored = cookieList.get(SETTINGS_STORAGE_KEY);

  //     if (restored) {
  //       value = JSON.parse(restored!.value);
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     // If stored data is not a strigified JSON this will fail,
  //     // that's why we catch the error
  //   }
  // }

  return value;
};

interface LayoutProps {
  children: ReactNode;
}

const Layout = async (props: LayoutProps) => {
  const { children } = props;

  const settings = restoreSettings();

  return (
    <html>
      <body>
        <RootLayout settings={settings}>
          {children}
          <NProgress />
        </RootLayout>
      </body>
    </html>
  );
};

export default Layout;
