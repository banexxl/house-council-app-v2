'use server';

import { getAllApartments, getAllApartmentsFromClientsBuildings } from "src/app/actions/apartment/apartment-actions";
import Apartments from "./apartments";
import { getViewer } from "src/libs/supabase/server-auth";
import { logout } from "src/app/auth/actions";
import { redirect } from "next/navigation";
import { Apartment } from "src/types/apartment";
import { resolveClientFromClientOrMember } from "src/app/actions/client/client-members";
import { paths } from "src/paths";

export default async function Page() {

  let apartments: Apartment[] = [];
  const { customer, tenant, admin } = await getViewer();
  const customerId = client ? client.id : clientMember ? clientMember.customerId : null;
  if (!client && !tenant && !admin && !clientMember) {
    redirect(paths.auth.login);
  }

  if (admin) {
    const { success, data } = await getAllApartments();
    if (success && data) {
      apartments = data;
    }
  } else if (client) {
    const { success, data } = await getAllApartmentsFromClientsBuildings(customerId!);
    if (success && data) {
      apartments = data.apartments;
    }
  } else if (clientMember) {
    const { success, data } = await resolveClientFromClientOrMember(customerId!);
    const { success: success2, data: data2 } = await getAllApartmentsFromClientsBuildings(customerId!);
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
