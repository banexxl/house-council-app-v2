'use server'

import { User } from '@supabase/supabase-js';
import { useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import { Client } from 'src/types/client';

export type UserDataCombined = {
     client: Client | null;
     userData: User | null;
     error?: string
}

export const checkIfUserIsLoggedInAndReturnUserData = async (): Promise<UserDataCombined> => {

     const supabase = await useServerSideSupabaseServiceRoleClient();
     const { data: userData, error } = await supabase.auth.getUser();
     if (error) {
          return { client: null, userData: null, error: error.message };
     }
     const { data: user, error: userError } = await supabase.from('tblClients').select().eq('email', userData.user.email).single();
     if (userError) {
          return { client: null, userData: null, error: userError.message };
     }
     //Get the session of the user to check if he is logged in
     const { data: session, error: sessionError } = await supabase.auth.getSession();
     if (sessionError) {
          return { client: null, userData: null, error: sessionError.message };
     }
     return { client: user, userData: userData.user };
}