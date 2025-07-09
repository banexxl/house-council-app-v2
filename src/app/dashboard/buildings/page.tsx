'use server';

import { getAllBuildingsFromClient } from "src/app/actions/building/building-actions";
import Buildings from "./buildings";
import { checkIfUserExistsAndReturnDataAndSessionObject } from "src/libs/supabase/server-auth";
import { logout } from "src/app/auth/actions";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Loading from "src/app/loading";

export default async function Page() {

  const { client } = await checkIfUserExistsAndReturnDataAndSessionObject();
  if (!client) {
    logout()
    redirect('/auth/login')
  };

  const [{ success, data, error }] = await Promise.all([
    getAllBuildingsFromClient(client?.id!),
  ]);

  return (
    <Suspense fallback={<Loading />}>
      <Buildings clientBuildings={success ? data! : []} />
    </Suspense>
  )
}

