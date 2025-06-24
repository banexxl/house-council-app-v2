'use server';

import { getAllApartmentsFromClientsBuildings } from "src/app/actions/apartment/apartment-actions";
import Apartments from "./apartments";
import { getServerAuth } from "src/libs/supabase/server-auth";
import { notFound, unauthorized } from "next/navigation";

export default async function Page() {

  const userSession = await getServerAuth();

  if (!userSession.client) {
    unauthorized();
  }

  const { success, data, error } = await getAllApartmentsFromClientsBuildings(userSession.client.id);

  return (
    <Apartments apartments={data ?? []} />
  );
}
