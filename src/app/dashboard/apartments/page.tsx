'use server';

import { getAllApartmentsFromClientsBuildings } from "src/app/actions/apartment/apartment-actions";
import Apartments from "./apartments";
import { checkIfUserIsLoggedInAndReturnUserData } from "src/libs/supabase/server-auth";

export default async function Page() {

  const userData = await checkIfUserIsLoggedInAndReturnUserData();

  const { success, data, error } = await getAllApartmentsFromClientsBuildings(userData.client!.id);

  return (
    <Apartments apartments={data ?? []} />
  );
}
