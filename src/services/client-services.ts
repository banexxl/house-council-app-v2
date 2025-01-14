import { supabase } from "src/libs/supabase/client"
import { Client } from "src/types/client"

export const saveClient = async (client: Client) => {
     // Save client
     const { data, error } = await supabase
          .from('tblClients')
          .insert(client)
     if (error) {
          console.error('Error saving client:', error)
          return false
     }
     return data
}