import { supabase } from "src/libs/supabase/client";
import { ClientStatus } from "src/types/client";

export const createClientStatus = async (clientStatus: ClientStatus): Promise<{ createClientStatusSuccess: boolean, createClientStatus?: ClientStatus, createClientStatusError?: any }> => {
     const { data, error } = await supabase
          .from('tblClientStatus')
          .insert(clientStatus);

     if (error) {
          return { createClientStatusSuccess: false, createClientStatusError: error };
     }

     return { createClientStatusSuccess: true, createClientStatus: data ? data[0] : undefined };
}

export const readClientStatuses = async (): Promise<{ readClientStatusesSuccess: boolean, readClientStatusesData: ClientStatus[], readClientStatusesError?: string }> => {

     const { data, error } = await supabase
          .from('tblClientStatus')
          .select('*');

     if (error) {
          return { readClientStatusesSuccess: false, readClientStatusesData: [], readClientStatusesError: error.message };
     }

     return { readClientStatusesSuccess: true, readClientStatusesData: data ?? [] };
}

export const readClientStatus = async (id: number): Promise<{ readClientStatusSuccess: boolean, readClientStatus?: ClientStatus, readClientStatusError?: string }> => {

     const { data, error } = await supabase
          .from('tblClientStatus')
          .select('*')
          .eq('id', id)
          .single();

     if (error) {
          return { readClientStatusSuccess: false, readClientStatusError: error.message };
     }

     return { readClientStatusSuccess: true, readClientStatus: data ?? undefined };
}

export const updateClientStatus = async (clientStatus: ClientStatus): Promise<{ updateClientStatusSuccess: boolean, updateClientStatus?: ClientStatus, updateClientStatusError?: any }> => {
     const { id, ...clientStatusData } = clientStatus;

     const { data, error } = await supabase
          .from('tblClientStatus')
          .update(clientStatusData)
          .match({ id });

     if (error) {
          return { updateClientStatusSuccess: false, updateClientStatusError: error };
     }

     return { updateClientStatusSuccess: true, updateClientStatus: data ? data[0] : undefined };
}

export const deleteClientStatus = async (id: number): Promise<{ deleteClientStatusSuccess: boolean, deleteClientStatusError?: string }> => {
     const { error } = await supabase
          .from('tblClientStatus')
          .delete()
          .eq('id', id);

     if (error) {
          return { deleteClientStatusSuccess: false, deleteClientStatusError: error.message };
     }

     return { deleteClientStatusSuccess: true };
}
