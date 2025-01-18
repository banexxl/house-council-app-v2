import { supabase } from "src/libs/supabase/client"
import { ClientType } from "src/types/client"

export const fetchClientTypes = async (): Promise<ClientType[]> => {
     // Fetch client types
     const { data, error } = await supabase
          .from('tblClientTypes')
          .select('id, name, description')

     if (error) {
          console.error('Error fetching client types:', error)
          return []
     }

     return data
}

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

