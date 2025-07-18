'use server'

import { User } from '@supabase/supabase-js'
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server'
import { Client } from 'src/types/client'

export type UserDataCombined = {
     client: Client | null
     userData: User | null
     error?: string
}

export const checkIfUserExistsAndReturnDataAndSessionObject = async (): Promise<UserDataCombined> => {
     const supabase = await useServerSideSupabaseAnonClient();

     // ✅ 1. Get current user from Supabase Auth
     const { data: userData, error: userError } = await supabase.auth.getUser();

     if (userError || !userData?.user) {
          return {
               client: null,
               userData: null,
               error: userError?.message || 'Failed to authenticate user',
          };
     }

     const user = userData.user;

     // ✅ 2. Look up tblClients by user_id
     const { data: client, error: clientError } = await supabase
          .from('tblClients')
          .select('*')
          .eq('user_id', user.id)
          .single();

     if (clientError) {
          return {
               client: null,
               userData: user,
               error: clientError.message,
          };
     }

     return {
          client,
          userData: user,
     };
};
