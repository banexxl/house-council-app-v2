'use server'

import { getViewer } from "src/libs/supabase/server-auth";
import Dashboard from "./dashboard";
import { redirect } from "next/navigation";
import { logout } from "../auth/actions";
import { Suspense } from "react";
import { DefaultPageSkeleton } from "src/sections/dashboard/skeletons/default-page-skeleton";

const Page = async () => {

  const { client, tenant, admin, clientMember } = await getViewer();
  if (!client && !tenant && !admin && !clientMember) {
    await logout();
    redirect('/auth/login');
  }

  if (tenant) {
    redirect('/dashboard/social/profile');
  }

  return (
    <Suspense fallback={<DefaultPageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
};

export default Page;
