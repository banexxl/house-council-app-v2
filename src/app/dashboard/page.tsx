'use server'

import { checkIfUserExistsAndReturnDataAndSessionObject } from "src/libs/supabase/server-auth";
import Dashboard from "./dashboard";
import { logout } from "../auth/actions";
import { redirect } from "next/navigation";

const Page = async () => {

  const { client } = await checkIfUserExistsAndReturnDataAndSessionObject();
  if (!client) {
    redirect('/auth/login')
  }

  return (
    <>
      <Dashboard />
    </>
  );
};

export default Page;
