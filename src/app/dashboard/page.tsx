'use server'

import { checkIfUserExistsAndReturnDataAndSessionObject } from "src/libs/supabase/server-auth";
import Dashboard from "./dashboard";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Loading from "../loading";

const Page = async () => {

  const { client, tenant, admin } = await checkIfUserExistsAndReturnDataAndSessionObject();
  if (!client && !tenant && !admin) {
    redirect('/auth/login')
  }

  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  );
};

export default Page;
