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
          console.log('error', error);

          return { success: false, error: error };
     }

     return { success: true, data: data ?? undefined };
}

export const getAllClientsAction = async (): Promise<{ success: boolean, data?: Client[], error?: string }> => {

     const { data, error } = await supabase
          .from('tblClients')
          .select('*');
     console.log('data', data);

     if (error) {
          return { success: false, error: error.message };
     }

     return { success: true, data: data ?? undefined };
}
