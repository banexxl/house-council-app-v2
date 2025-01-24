'use server'

import { supabase } from "src/libs/supabase/client"
import { Client } from "src/types/client"

export const saveClientAction = async (client: Client): Promise<{ success: boolean, data?: Client, error?: any }> => {
     const { id, ...clientData } = client;

     // Save client
     const { data, error } = await supabase
          .from('tblClients')
          .insert(clientData);

     if (error) {
          return { success: false, error: error };
     }

     return { success: true, data: data ?? undefined };
}

export const getAllClientsAction = async (): Promise<{ getAllClientsActionSuccess: boolean, getAllClientsActionData?: Client[], getAllClientsActionError?: string }> => {
     try {
          const { data, error } = await supabase.from("tblClients").select(`
        *,
        tblClientStatuses (name),
        tblClientTypes (name)
      `)

          if (error) throw error

          return {
               getAllClientsActionSuccess: true, getAllClientsActionData: data.map(client => ({
                    ...client,
                    status: client.tblClientStatuses.name,
                    type: client.tblClientTypes.name
               })) as Client[]
          }

     } catch (error) {
          return { getAllClientsActionSuccess: false, getAllClientsActionData: [], getAllClientsActionError: "Failed to fetch clients" }
     }
}
