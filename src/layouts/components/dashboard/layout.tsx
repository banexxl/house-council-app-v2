import type { FC, ReactNode } from 'react';
import { useEffect, useState } from 'react';
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
  const [role, setRole] = useState<'admin' | 'client' | 'tenant'>('tenant');

  useEffect(() => {
    const getRole = async () => {
      const { data } = await supabaseBrowserClient.auth.getSession();
      const email = data.session?.user?.email;
      if (!email) return;

      // 1. Check tblSuperAdmins
      const { data: admin } = await supabaseBrowserClient
        .from('tblSuperAdmins')
        .select('id')
        .eq('email', email)
        .single();
      if (admin) {
        setRole('admin');
        return;
      }

      // 2. Check tblClients
      const { data: client } = await supabaseBrowserClient
        .from('tblClients')
        .select('id')
        .eq('email', email)
        .single();
      if (client) {
        setRole('client');
        return;
      }

      // 3. Check tblTenants
      const { data: tenant } = await supabaseBrowserClient
        .from('tblTenants')
        .select('id')
        .eq('email', email)
        .single();
      if (tenant) {
        setRole('tenant');
        return;
      }
    };

    getRole();
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
