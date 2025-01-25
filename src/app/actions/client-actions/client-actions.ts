'use server'

import { supabase } from "src/libs/supabase/client"
import { Client } from "src/types/client"

export const saveClientAction = async (client: Client): Promise<{ saveClientActionSuccess: boolean, saveClientActionData?: Client, saveClientActionError?: any }> => {
     const { id, ...clientData } = client;

     // Save client
     const { data, error } = await supabase
          .from('tblClients')
          .insert(clientData);

     if (error) {
          return { saveClientActionSuccess: false, saveClientActionError: error };
     }

     return { saveClientActionSuccess: true, saveClientActionData: data ?? undefined };
}

export const getAllClientsAction = async (): Promise<{
     getAllClientsActionSuccess: boolean;
     getAllClientsActionData?: Client[];
     getAllClientsActionError?: string;
}> => {
     try {
          const { data, error } = await supabase
               .from("tblClients")
               .select(`
        *,
        tblClientStatuses (name),
        tblClientTypes (name)
      `);

          if (error) throw error;

          // Transform the data to remove unnecessary properties
          const transformedData = data.map(client => ({
               ...client,
               status: client.tblClientStatuses?.name, // Map tblClientStatuses.name to status
               type: client.tblClientTypes?.name, // Map tblClientTypes.name to type
          }));

          // Remove the tblClientStatuses and tblClientTypes properties
          transformedData.forEach(client => {
               delete client.tblClientStatuses;
               delete client.tblClientTypes;
          });

          return {
               getAllClientsActionSuccess: true,
               getAllClientsActionData: transformedData as Client[],
          };
     } catch (error) {
          return {
               getAllClientsActionSuccess: false,
               getAllClientsActionData: [],
               getAllClientsActionError: "Failed to fetch clients",
          };
     }
};

