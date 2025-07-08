'use server'

import { Session, User } from '@supabase/supabase-js'
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server'
import { Client } from 'src/types/client'

export type UserDataCombined = {
     client: Client | null
     userData: User | null
     error?: string
}

export const checkIfUserExistsAndReturnDataAndSessionObject = async (): Promise<UserDataCombined> => {
     const supabase = await useServerSideSupabaseAnonClient()

     // ✅ 1. Securely get authenticated user from Supabase Auth server
     const { data: userData, error: userError } = await supabase.auth.getUser()

     if (userError || !userData?.user) {
          return {
               client: null,
               userData: null,
               error: userError?.message || 'Failed to authenticate user',
          }
     }

     const user = userData.user

     // ✅ 4. Look up the client record by email
     const { data: client, error: clientError } = await supabase
          .from('tblClients')
          .select('*')
          .eq('email', user.email)
          .single()

     if (clientError) {
          return {
               client: null,
               userData: user,
               error: clientError.message,
          }
     }

     return {
          client,
          userData: user,
     }
}
