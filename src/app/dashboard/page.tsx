'use server'

import { checkIfUserExistsAndReturnDataAndSessionObject } from "src/libs/supabase/server-auth";
import Dashboard from "./dashboard";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Loading from "../loading";
import { Unauthorized } from "src/components/unauthorized";
import { logout } from "../auth/actions";

const Page = async () => {

  const { client, tenant, admin } = await checkIfUserExistsAndReturnDataAndSessionObject();
  if (!client && !tenant && !admin) {
    logout();
  }

  if (tenant) {
    redirect('/dashboard/products');
  }

  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  );
};

export default Page;
