'use server';

import { getAllApartmentsFromClientsBuildings } from "src/app/actions/apartment/apartment-actions";
import Apartments from "./apartments";
import { checkIfUserExistsAndReturnDataAndSessionObject } from "src/libs/supabase/server-auth";
import { logout } from "src/app/auth/actions";
import { redirect } from "next/navigation";

export default async function Page() {

  const { client, tenant, admin } = await checkIfUserExistsAndReturnDataAndSessionObject();
  if (!client && !tenant && !admin) {
    logout()
    redirect('/auth/login')
  };

  const { success, data, error } = await getAllApartmentsFromClientsBuildings(client!.id);

  return (
    <Apartments apartments={data?.apartments ?? []} />
  );
}
