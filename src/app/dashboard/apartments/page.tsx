'use server';

import { getAllApartments, getAllApartmentsFromClientsBuildings } from "src/app/actions/apartment/apartment-actions";
import Apartments from "./apartments";
import { getViewer } from "src/libs/supabase/server-auth";
import { logout } from "src/app/auth/actions";
import { redirect } from "next/navigation";
import { Apartment } from "src/types/apartment";
import { resolveClientFromClientOrMember } from "src/app/actions/client/client-members";

export default async function Page() {

  let apartments: Apartment[] = [];
  const { client, clientMember, tenant, admin } = await getViewer();
  const client_id = client ? client.id : clientMember ? clientMember.client_id : null;
  if (!client && !tenant && !admin && !clientMember) {
    redirect(paths.auth.login);
  }

  if (admin) {
    const { success, data } = await getAllApartments();
    if (success && data) {
      apartments = data;
    }
  } else if (client) {
    const { success, data } = await getAllApartmentsFromClientsBuildings(client_id!);
    if (success && data) {
      apartments = data.apartments;
    }
  } else if (clientMember) {
    const { success, data } = await resolveClientFromClientOrMember(client_id!);
    const { success: success2, data: data2 } = await getAllApartmentsFromClientsBuildings(client_id!);
    if (success2 && data2) {
      apartments = data2.apartments;
    }
  } else if (tenant) {
    redirect('/dashboard/social/profile');
  }

  return (
    <Apartments apartments={apartments ?? []} />
  );
}
