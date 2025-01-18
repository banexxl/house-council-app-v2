import { supabase } from "src/libs/supabase/client"
import { ClientType } from "src/types/client"

export const fetchClientStatuses = async (): Promise<ClientType[]> => {
     // Fetch client statuses
     const { data, error } = await supabase
          .from('tblClientStatuses')
          .select('id, name, description')

     if (error) {
          console.error('Error fetching client statuses:', error)
          return []
     }

     return data
}