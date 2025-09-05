'use client'

import { useEffect, type ReactNode } from 'react';
import { NProgress } from 'src/components/nprogress';
import { Layout as RootLayout } from 'src/layouts/root';
import { initAnnouncementsRealtime } from 'src/realtime/sb-realtime';
import 'src/global.css';


interface LayoutProps {
  children: ReactNode;
}

const Layout = (props: LayoutProps) => {

  const { children } = props;

  useEffect(() => {
    let unsubscribe: (() => Promise<void>) | undefined;

    const init = () => {
      try {
        unsubscribe = initAnnouncementsRealtime((payload) => {
          payload.table;
        });
      } catch (err) {
        console.error('[announcements] realtime init failed', err);
      }
    };

    init();

    return () => {
      if (unsubscribe) {
        unsubscribe()
          .then(() => console.log('[announcements] realtime unsubscribed'))
          .catch((err) => console.error('[announcements] unsubscribe failed', err));
      }
    };
  }, []);

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
