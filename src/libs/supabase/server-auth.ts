"use server";

import { User } from "@supabase/supabase-js";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { Client } from "src/types/client";
import { Admin } from "src/types/admin";

export type UserDataCombined = {
  client: Client | null;
  admin: Admin | null;
  userData: User | null;
  error?: string;
};

export const checkIfUserExistsAndReturnDataAndSessionObject =
  async (): Promise<UserDataCombined> => {
    const supabase = await useServerSideSupabaseAnonClient();

    // ✅ 1. Get current user from Supabase Auth
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return {
        client: null,
        userData: null,
        error: userError?.message || "Failed to authenticate user",
      };
    }

    const user = userData.user;

    // ✅ 2. Look up tblClients by user_id
    const { data: client, error: clientError } = await supabase
      .from("tblClients")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // ✅ 3. Look up tblAdmins by user_id
    const { data: admin, error: adminError } = await supabase
      .from("tblAdmins")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (clientError && adminError) {
      return {
        client: null,
        admin: null,
        userData: user,
        error: clientError.message || adminError.message,
      };
    }

    return {
      client: client ?? null,
      admin: admin ?? null,
      userData: user,
    };
  };
