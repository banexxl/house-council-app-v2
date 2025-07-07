'use server';

import { getAllBuildingsFromClient } from "src/app/actions/building/building-actions";
import Buildings from "./buildings";
import { getServerAuth } from "src/libs/supabase/server-auth";
import { readAllEntities } from "src/app/actions/base-entity-actions";
import { BaseEntity } from "src/types/base-entity";

export default async function Page() {

  const userSession = await getServerAuth()
  console.log('userSession', userSession);

  if (!userSession.client) {
    return <div>No client found</div>;
  }
  const [{ success, data, error }] = await Promise.all([
    getAllBuildingsFromClient(userSession.client?.id!),
  ]);

  return (
    <Buildings clientBuildings={success ? data! : []} />
  )
}

