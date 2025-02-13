'use server'

import { revalidatePath } from "next/cache"
import { supabase } from "src/libs/supabase/client"
import { Client } from "src/types/client"

export const createOrUpdateClientAction = async (client: Client): Promise<{
     saveClientActionSuccess: boolean
     saveClientActionData?: Client
     saveClientActionError?: any
}> => {

     const { id, ...clientData } = client
     let result

     if (id && id !== "") {
          // Update existing client
          result = await supabase.from("tblClients").update({ ...clientData, updated_at: new Date().toISOString() }).eq("id", id).select().single()
          revalidatePath(`/dashboard/clients/${id}`)
     } else {
          // Insert new client
          result = await supabase.from("tblClients").insert(clientData).select().single()
     }

     const { data, error } = result
     console.log('data', data);

     console.log('error', error);

     if (error) {
          return { saveClientActionSuccess: false, saveClientActionError: error }
     }

     if (!data) {
          return { saveClientActionSuccess: false, saveClientActionError: "No data returned after operation" }
     }

     return {
          saveClientActionSuccess: true,
          saveClientActionData: data as Client,
     }
}

export const readAllClientsAction = async (): Promise<{
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

export const readClientByIdAction = async (
     clientId: string,
): Promise<{
     getClientByIdActionSuccess: boolean
     getClientByIdActionData?: Client
     getClientByIdActionError?: string
}> => {
     try {
          const { data, error } = await supabase
               .from("tblClients")
               .select(`*`)
               .eq("id", clientId)
               .single()

          if (error) throw error

          if (!data) {
               throw new Error("Client not found")
          }

          // Destructure the properties we want, including nested ones
          const { tblClientStatuses, tblClientTypes, ...clientData } = data

          return {
               getClientByIdActionSuccess: true,
               getClientByIdActionData: clientData,
          }

     } catch (error) {
          console.error("Error fetching client:", error)
          return {
               getClientByIdActionSuccess: false,
               getClientByIdActionError: "Failed to fetch client",
          }
     }
}

export const deleteClientByIDsAction = async (ids: string[]): Promise<{ deleteClientByIDsActionSuccess: boolean, deleteClientByIDsActionError?: string }> => {
     try {
          const { error } = await supabase.from('tblClients').delete().in('id', ids);
          if (error) {
               console.error('Error deleting clients:', error);
               return { deleteClientByIDsActionSuccess: false, deleteClientByIDsActionError: error.message }
          }
          revalidatePath('/dashboard/clients');
          return { deleteClientByIDsActionSuccess: true }
     } catch (error) {
          console.error('Error deleting clients:', error);
          return { deleteClientByIDsActionSuccess: false, deleteClientByIDsActionError: error.message }
     }
}