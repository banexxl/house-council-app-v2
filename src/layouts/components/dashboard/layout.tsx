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

  useEffect(() => {
    let stop: undefined | (() => Promise<void>);
    (async () => {
      stop = await initNotificationsRealtime(() => {
        // handle payload if you want
      });
    })();

    return () => {
      if (stop) stop().catch(console.error);
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
