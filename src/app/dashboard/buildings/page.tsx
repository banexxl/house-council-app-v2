'use server';

import { getAllBuildingsFromClient } from "src/app/actions/building/building-actions";
import Buildings from "./buildings";
import { checkIfUserIsLoggedInAndReturnUserData } from "src/libs/supabase/server-auth";

export default async function Page() {

  const userData = await checkIfUserIsLoggedInAndReturnUserData()

  const [{ success, data, error }] = await Promise.all([
    getAllBuildingsFromClient(userData.client?.id!),
  ]);

  return (
    <Buildings clientBuildings={success ? data! : []} />
  )
}

