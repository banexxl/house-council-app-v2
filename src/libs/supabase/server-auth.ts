'use server'

import { User } from '@supabase/supabase-js';
import { useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import { Client } from 'src/types/client';

export type UserSessionCombined = {
     client: Client | null;
     session: User | null;
     error?: string
}

export const getServerAuth = async (): Promise<UserSessionCombined> => {

     const supabase = await useServerSideSupabaseServiceRoleClient();
     const { data: userSession, error } = await supabase.auth.getUser();
     if (error) {
          return { client: null, session: null, error: error.message };
     }
     const { data: user, error: userError } = await supabase.from('tblClients').select().eq('email', userSession.user.email).single();
     if (userError) {
          return { client: null, session: null, error: userError.message };
     }
     return { client: user, session: userSession.user };
}