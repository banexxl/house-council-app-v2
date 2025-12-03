'use server';

import { getAllBuildingsFromClient, getAllBuildings } from "src/app/actions/building/building-actions";
import Buildings from "./buildings";
import { getViewer } from "src/libs/supabase/server-auth";
import { logout } from "src/app/auth/actions";
import { redirect } from "next/navigation";
import { Building } from "src/types/building";
import { resolveClientFromClientOrMember } from "src/app/actions/client/client-members";


export default async function Page() {

  let buildings: Building[] = [];
  const { client, clientMember, tenant, admin } = await getViewer();
  if (!client && !clientMember && !tenant && !admin) {
    redirect('/auth/login');
  }

  if (admin) {
    const { success, data } = await getAllBuildings();
    buildings = success ? data! : [];
  } else if (client) {
    const { success, data } = await getAllBuildingsFromClient(client.id);
    buildings = success ? data! : [];
  } else if (clientMember) {
    const { success, data } = await resolveClientFromClientOrMember(clientMember.id);
    const { success: success2, data: data2 } = await getAllBuildingsFromClient(data?.id!);
    buildings = success2 ? data2! : [];
  } else if (tenant) {
    buildings = [];
  }

  return (
    <Buildings clientBuildings={buildings} />
  );
}

