'use server';

import { getAllBuildingsFromClient } from "src/app/actions/building/building-actions";
import Buildings from "./buildings";
import { checkIfUserExistsAndReturnDataAndSessionObject } from "src/libs/supabase/server-auth";
import { logout } from "src/app/auth/actions";
import { redirect } from "next/navigation";

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
    <Buildings clientBuildings={success ? data! : []} />
  )
}

