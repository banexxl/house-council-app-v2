// app/dashboard/layout.tsx
import { type ReactNode } from 'react';
import { getViewer } from 'src/libs/supabase/server-auth';
import { redirect } from 'next/navigation';
import DashboardClientLayout from './client-layout';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
     const { client, tenant, admin, clientMember } = await getViewer();

     if (!client && !tenant && !admin && !clientMember) {
          redirect('/auth/login');
     }

     return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
