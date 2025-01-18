'use server'

import { supabase } from "src/libs/supabase/client"
import { Client } from "src/types/client"

export const saveClientAction = async (client: Client): Promise<{ success: boolean, data?: Client, error?: any }> => {
     console.log('client', client);


     // Save client
     const { data, error } = await supabase
          .from('tblClients')
          .insert(client)
     if (error) {
          console.error('Error saving client:', error)
          return { success: false, error }
     }
     return { success: true, data: data ?? undefined }
}
