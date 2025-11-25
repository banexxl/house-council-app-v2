'use server'

import { getViewer } from "src/libs/supabase/server-auth";
import Dashboard from "./dashboard";
import { redirect } from "next/navigation";
import { logout } from "../auth/actions";

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
    <Dashboard />
  );
};

export default Page;
