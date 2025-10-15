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

      // Query each table as single rows to avoid truthy [] bugs
      const [adminRes, tenantRes, clientMemberRes, clientRes] = await Promise.all([
        supabaseBrowserClient
          .from(TABLES.SUPER_ADMINS)
          .select('id')
          .eq('email', email)
          .maybeSingle(),            // null if none
        supabaseBrowserClient
          .from(TABLES.TENANTS)
          .select('id')
          .eq('email', email)
          .maybeSingle(),
        supabaseBrowserClient
          .from(TABLES.CLIENT_MEMBERS)
          .select('id')
          .eq('email', email)
          .maybeSingle(),
        supabaseBrowserClient
          .from(TABLES.CLIENTS)
          .select('id')
          .eq('email', email)
          .maybeSingle(),
      ]);

      // Explicit precedence: admin > tenant > clientMember > client
      if (adminRes.data) return setRole('admin');
      if (tenantRes.data) return setRole('tenant');
      if (clientMemberRes.data) return setRole('clientMember');
      if (clientRes.data) return setRole('client');

      // fallback (optional): keep as tenant or choose a "guest" role if you have one
      setRole('tenant');
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
