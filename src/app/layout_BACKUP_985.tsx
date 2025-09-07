'use client'

<<<<<<< HEAD
import { type ReactNode } from 'react';
import { NProgress } from 'src/components/nprogress';
import { Layout as RootLayout } from 'src/layouts/root';
=======
import { useEffect, type ReactNode } from 'react';
import { NProgress } from 'src/components/nprogress';
import { Layout as RootLayout } from 'src/layouts/root';
import { initAnnouncementsRealtime } from 'src/realtime/sb-realtime';
>>>>>>> ova verzija RRAAADDIIIII
import 'src/global.css';


interface LayoutProps {
  children: ReactNode;
}

const Layout = (props: LayoutProps) => {

  const { children } = props;

<<<<<<< HEAD
  // Realtime subscriptions moved to dashboard layout so auth pages don't subscribe.
=======
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
>>>>>>> ova verzija RRAAADDIIIII

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
