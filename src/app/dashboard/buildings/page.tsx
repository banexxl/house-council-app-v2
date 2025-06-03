'use server';

import { getAllBuildingsFromClient } from "src/app/actions/building/building-actions";
import Buildings from "./buildings";
import { getServerAuth } from "src/libs/supabase/server-auth";

export default async function Page() {

  const userSession = await getServerAuth()
  const { success, data, error } = await getAllBuildingsFromClient(userSession.client?.id!);

  return (
    <Buildings clientBuildings={success ? data! : []} />
  )
}

