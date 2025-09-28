'use server';

import { getAllApartments, getAllApartmentsFromClientsBuildings } from "src/app/actions/apartment/apartment-actions";
import Apartments from "./apartments";
import { getViewer } from "src/libs/supabase/server-auth";
import { logout } from "src/app/auth/actions";
import { redirect } from "next/navigation";
import { Apartment } from "src/types/apartment";
import { readClientFromClientMemberID } from "src/app/actions/client/client-members";

export default async function Page() {

  let apartments: Apartment[] = [];
  const { client, clientMember, tenant, admin } = await getViewer();
  if (!client && !tenant && !admin && !clientMember) {
    logout();
  }

  if (admin) {
    const { success, data } = await getAllApartments();
    if (success && data) {
      apartments = data;
    }
  } else if (client) {
    const { success, data } = await getAllApartmentsFromClientsBuildings(client.id);
    if (success && data) {
      apartments = data.apartments;
    }
  } else if (clientMember) {
    const { success, data } = await readClientFromClientMemberID(clientMember.id);
    const { success: success2, data: data2 } = await getAllApartmentsFromClientsBuildings(typeof data === 'string' ? data : data?.id!);
    if (success2 && data2) {
      apartments = data2.apartments;
    }
  } else if (tenant) {
    redirect('/dashboard/products');
  }

  return (
    <Apartments apartments={apartments ?? []} />
  );
}
