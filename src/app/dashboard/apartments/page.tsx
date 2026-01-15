'use server';

import { getAllApartments, getAllApartmentsFromCustomersBuildings } from "src/app/actions/apartment/apartment-actions";
import Apartments from "./apartments";
import { getViewer } from "src/libs/supabase/server-auth";
import { redirect } from "next/navigation";
import { Apartment } from "src/types/apartment";
import { paths } from "src/paths";

export default async function Page() {

  let apartments: Apartment[] = [];
  const { customer, tenant, admin } = await getViewer();
  const customerId = customer ? customer.id : null;
  if (!customer && !tenant && !admin) {
    redirect(paths.auth.login);
  }

  if (admin) {
    const { success, data } = await getAllApartments();
    if (success && data) {
      apartments = data;
    }
  } else if (customer) {
    const { success, data } = await getAllApartmentsFromCustomersBuildings(customerId!);
    if (success && data) {
      apartments = data.apartments;
    }
  } else if (tenant) {
    redirect('/dashboard/social/profile');
  }

  return (
    <Apartments apartments={apartments ?? []} />
  );
}
