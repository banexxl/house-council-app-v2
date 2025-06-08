'use server';

import { getAllBuildingsFromClient } from "src/app/actions/building/building-actions";
import Buildings from "./buildings";
import { getServerAuth } from "src/libs/supabase/server-auth";
import { readAllEntities } from "src/app/actions/base-entity-actions";
import { BaseEntity } from "src/types/base-entity";

export default async function Page() {

  const userSession = await getServerAuth()
  const [{ success, data, error }, buildingStatuses] = await Promise.all([
    getAllBuildingsFromClient(userSession.client?.id!),
    readAllEntities<BaseEntity & { resource_string: string }>("tblBuildingStatuses"),
  ]);

  return (
    <Buildings clientBuildings={success ? data! : []} buildingStatuses={buildingStatuses} />
  )
}

