import { supabase } from "src/libs/supabase/client"
import { Client } from "src/types/client"

export const saveClient = async (client: Client): Promise<{ success: boolean, data?: Client, error?: any }> => {
     // Save client
     const { data, error } = await supabase
          .from('tblClients')
          .insert(client); // Insert without the id field

     if (error) {
          return { success: false, error }
     }
     return { success: true, data: data ?? undefined }
}