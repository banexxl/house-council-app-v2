"use client";

import type { FC, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useSettings } from 'src/hooks/use-settings';
import { useSections } from './config';
import { HorizontalLayout } from './horizontal-layout';
import { VerticalLayout } from './vertical-layout';
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';
import { TABLES } from 'src/libs/supabase/tables';
import log from 'src/utils/logger';

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
          .from(TABLES.SUPER_ADMINS)
          .select('id')
          .eq('email', email)
          .limit(1),
        supabaseBrowserClient
          .from(TABLES.CLIENTS)
          .select('id')
          .eq('email', email)
          .limit(1),
        supabaseBrowserClient
          .from(TABLES.CLIENT_MEMBERS)
          .select('id')
          .eq('email', email)
          .limit(1),
        supabaseBrowserClient
          .from(TABLES.TENANTS)
          .select('id')
          .eq('email', email)
          .limit(1),
      ]);

      if (adminRes.data?.length! > 0) {
        setRole('admin');
        return;
      }
      if (clientRes.data) {
        setRole('client');
        return;
      }
      if (clientMemberRes.data?.length! > 0) {
        setRole('clientMember');
        return;
      }
      if (tenantRes.data?.length! > 0) {
        setRole('tenant');
        return;
      }
    };

    getRole();
  }, []);
  log(`role ${role}`)
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
