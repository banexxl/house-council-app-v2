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

export const getClientByIdAction = async (
     clientId: string,
): Promise<{
     getClientByIdActionSuccess: boolean
     getClientByIdActionData?: Client
     getClientByIdActionError?: string
}> => {
     try {

          const { data, error } = await supabase
               .from("tblClients")
               .select(`
        *,
        tblClientStatuses (name),
        tblClientTypes (name)
      `)
               .eq("id", clientId)
               .single()

          if (error) throw error

          if (!data) {
               throw new Error("Client not found")
          }

          // Transform the data to a plain object
          const transformedData: Client = {
               ...data,
               status: data.tblClientStatuses?.name || "",
               type: data.tblClientTypes?.name || "",
          }

          // Remove the nested objects
          // delete transformedData.tblClientStatuses
          // delete transformedData.tblClientTypes

          return Object.create({
               getClientByIdActionSuccess: true,
               getClientByIdActionData: transformedData as Client,
          })
     } catch (error) {
          console.error("Error fetching client:", error)
          return {
               getClientByIdActionSuccess: false,
               getClientByIdActionError: "Failed to fetch client",
          }
     }
}