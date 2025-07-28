'use server';

import { getAllApartments, getAllApartmentsFromClientsBuildings } from "src/app/actions/apartment/apartment-actions";
import Apartments from "./apartments";
import { checkIfUserExistsAndReturnDataAndSessionObject } from "src/libs/supabase/server-auth";
import { logout } from "src/app/auth/actions";
import { redirect } from "next/navigation";
import { Apartment } from "src/types/apartment";

export default async function Page() {

  let apartments: Apartment[] = [];
  const { client, tenant, admin } = await checkIfUserExistsAndReturnDataAndSessionObject();
  if (!client && !tenant && !admin) {
    logout();
    redirect('/auth/login');
  }
  console.log('User role:', { client, tenant, admin });

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
  } else if (tenant) {
    apartments = [];
  }

  return (
    <Apartments apartments={apartments ?? []} />
  );
}
