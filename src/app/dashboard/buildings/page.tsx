'use server';

import { getAllBuildingsFromClient, getAllBuildings } from "src/app/actions/building/building-actions";
import Buildings from "./buildings";
import { getViewer } from "src/libs/supabase/server-auth";
import { logout } from "src/app/auth/actions";
import { redirect } from "next/navigation";
import { Building } from "src/types/building";


export default async function Page() {

  let buildings: Building[] = [];
  const { client, clientMember, tenant, admin } = await getViewer();
  if (!client && !clientMember && !tenant && !admin) {
    logout();
  }

  if (admin) {
    const { success, data } = await getAllBuildings();
    buildings = success ? data! : [];
  } else if (client) {
    const { success, data } = await getAllBuildingsFromClient(client.id);
    buildings = success ? data! : [];
  } else if (tenant) {
    buildings = [];
  }

  return (
    <Buildings clientBuildings={buildings} />
  );
}

