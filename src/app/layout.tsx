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

    const init = async () => {
      console.log('[announcements] init starting');
      try {
        unsubscribe = await initAnnouncementsRealtime((payload) => {
          const tbl = (payload as any).table || (payload as any).new?.table || 'unknown-table';
          console.log('[announcements] realtime event', tbl, payload.eventType, { new: payload.new, old: payload.old });
        });
        console.log('[announcements] subscription created');
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
