"use client";

import type { FC, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Box, Stack, Skeleton, CircularProgress } from '@mui/material';
import { useSettings } from 'src/hooks/use-settings';
import { useSections } from './config';
import { HorizontalLayout } from './horizontal-layout';
import { VerticalLayout } from './vertical-layout';
import { PresenceInitializer } from 'src/components/presence-initializer';
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';
import { TABLES } from 'src/libs/supabase/tables';

type Role = 'admin' | 'client' | 'clientMember' | 'tenant';

interface LayoutProps { children?: ReactNode; }

export const Layout: FC<LayoutProps> = (props) => {
  const settings = useSettings();
  const [role, setRole] = useState<Role | null>(null); // start loading

  useEffect(() => {
    const getRole = async () => {
      const { data } = await supabaseBrowserClient.auth.getSession();
      const email = data.session?.user?.email;
      if (!email) { setRole('tenant'); return; }

      const [adminRes, tenantRes, clientMemberRes, clientRes] = await Promise.all([
        supabaseBrowserClient.from(TABLES.SUPER_ADMINS).select('id').eq('email', email).maybeSingle(),
        supabaseBrowserClient.from(TABLES.TENANTS).select('id').eq('email', email).maybeSingle(),
        supabaseBrowserClient.from(TABLES.CLIENT_MEMBERS).select('id').eq('email', email).maybeSingle(),
        supabaseBrowserClient.from(TABLES.CLIENTS).select('id').eq('email', email).maybeSingle(),
      ]);

      if (adminRes.data) return setRole('admin');
      if (tenantRes.data) return setRole('tenant');
      if (clientMemberRes.data) return setRole('clientMember');
      if (clientRes.data) return setRole('client');
      setRole('tenant');
    };
    getRole();
  }, []);

  // ALWAYS call the hook (stable hook order)
  const sections = useSections(role);

  // Sidebar skeleton while resolving role (no flicker of wrong items)
  if (role === null) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Box sx={{ width: 280, bgcolor: 'background.paper', p: 2, borderRight: 1, borderColor: 'divider' }}>
          <Skeleton variant="rounded" height={36} sx={{ mb: 1 }} />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={36} sx={{ mb: 1 }} />
          ))}
        </Box>
        <Stack sx={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Stack>
      </Box>
    );
  }

  if (settings.layout === 'horizontal') {
    return (
      <>
        <PresenceInitializer />
        <HorizontalLayout sections={sections} navColor={settings.navColor} {...props} />
      </>
    );
  }

  return (
    <>
      <PresenceInitializer />
      <VerticalLayout sections={sections} navColor={settings.navColor} {...props} />
    </>
  );
};
