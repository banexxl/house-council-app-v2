"use client";

import type { FC, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { initNotificationsRealtime } from 'src/realtime/sb-realtime';
import { useSettings } from 'src/hooks/use-settings';
import { useSections } from './config';
import { HorizontalLayout } from './horizontal-layout';
import { VerticalLayout } from './vertical-layout';
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';

interface LayoutProps {
  children?: ReactNode;
}

export const Layout: FC<LayoutProps> = ((props) => {

  const settings = useSettings();
  const [role, setRole] = useState<'admin' | 'client' | 'clientMember' | 'tenant'>('tenant');

  useEffect(() => {
    const getRole = async () => {
      const { data } = await supabaseBrowserClient.auth.getSession();
      const email = data.session?.user?.email;
      if (!email) return;

      const [adminRes, clientRes, clientMemberRes, tenantRes] = await Promise.all([
        supabaseBrowserClient
          .from('tblSuperAdmins')
          .select('id')
          .eq('email', email)
          .single(),
        supabaseBrowserClient
          .from('tblClients')
          .select('id')
          .eq('email', email)
          .single(),
        supabaseBrowserClient
          .from('tblClientMembers')
          .select('id')
          .eq('email', email)
          .single(),
        supabaseBrowserClient
          .from('tblTenants')
          .select('id')
          .eq('email', email)
          .single(),
      ]);

      if (adminRes.data) {
        setRole('admin');
        return;
      }
      if (clientRes.data) {
        setRole('client');
        return;
      }
      if (clientMemberRes.data) {
        setRole('clientMember');
        return;
      }
      if (tenantRes.data) {
        setRole('tenant');
        return;
      }
    };

    getRole();
  }, []);

  // Subscribe to announcements only while dashboard layout is mounted (i.e., user in protected area)
  useEffect(() => {
    let unsubscribe: (() => Promise<void>) | undefined;

    const init = () => {
      console.log('[notifications] init starting');
      try {
        unsubscribe = initNotificationsRealtime(() => { });
        console.log('[notifications] init finished');
      } catch (err) {
        console.error('[notifications] init failed', err);
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

  const sections = useSections(role);

  if (settings.layout === 'horizontal') {
    return (
      <HorizontalLayout
        sections={sections}
        navColor={settings.navColor}
        {...props}
      />
    );
  }

  return (
    <VerticalLayout
      sections={sections}
      navColor={settings.navColor}
      {...props}
    />
  );
});
