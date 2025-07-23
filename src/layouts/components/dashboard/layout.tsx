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
  const [role, setRole] = useState<'admin' | 'client' | 'tenant'>('admin');

  useEffect(() => {
    const getRole = async () => {
      const { data } = await supabaseBrowserClient.auth.getSession();
      const metaRole =
        data.session?.user?.user_metadata?.role ||
        data.session?.user?.app_metadata?.role;
      if (
        metaRole === 'admin' ||
        metaRole === 'client' ||
        metaRole === 'tenant'
      ) {
        setRole(metaRole);
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
