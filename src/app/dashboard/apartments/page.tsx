'use server';

import { getAllApartmentsFromClientsBuildings } from "src/app/actions/apartment/apartment-actions";
import Apartments from "./apartments";
import { getServerAuth } from "src/libs/supabase/server-auth";

export default async function Page() {

  const userSession = await getServerAuth();

  const { success, data, error } = await getAllApartmentsFromClientsBuildings(userSession.client!.id);

  return (
    <Apartments apartments={data ?? []} />
  );
}
