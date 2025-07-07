'use server'

import { User } from '@supabase/supabase-js';
import { useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import { Client } from 'src/types/client';

export type UserDataCombined = {
     client: Client | null;
     userData: User | null;
     error?: string
}

export const useAuth = async (): Promise<UserDataCombined> => {

     const supabase = await useServerSideSupabaseServiceRoleClient();
     const { data: userSession, error } = await supabase.auth.getUser();
     if (error) {
          return { client: null, userData: null, error: error.message };
     }
     const { data: user, error: userError } = await supabase.from('tblClients').select().eq('email', userSession.user.email).single();
     if (userError) {
          return { client: null, userData: null, error: userError.message };
     }
     return { client: user, userData: userSession.user };
}