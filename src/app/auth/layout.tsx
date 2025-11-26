import type { ReactNode } from 'react';

import { Layout as ModernLayout } from 'src/layouts/auth/modern-layout';
import { Layout as RootLayout } from 'src/layouts/root';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <RootLayout>
      <ModernLayout>{children}</ModernLayout>
    </RootLayout>
  );
}
