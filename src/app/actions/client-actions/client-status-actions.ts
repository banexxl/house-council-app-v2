'use server'

import { supabase } from "src/libs/supabase/client";
import { BaseEntity } from "../base-entity-services";

export const createClientStatus = async (clientStatus: BaseEntity): Promise<{ createClientStatusSuccess: boolean, createClientStatus?: BaseEntity, createClientStatusError?: any }> => {
     const { data, error } = await supabase
          .from('tblClientStatuses')
          .insert(clientStatus)
          .select()
          .single();

     if (error) {
          return { createClientStatusSuccess: false, createClientStatusError: error };
     }

     return { createClientStatusSuccess: true, createClientStatus: data ? data[0] : undefined };
}

export const readClientStatuses = async (): Promise<{ readClientStatusesSuccess: boolean, readClientStatusesData: BaseEntity[], readClientStatusesError?: string }> => {

     const { data, error } = await supabase
          .from('tblClientStatuses')
          .select('*');

     if (error) {
          return { readClientStatusesSuccess: false, readClientStatusesData: [], readClientStatusesError: error.message };
     }

     return { readClientStatusesSuccess: true, readClientStatusesData: data ?? [] };
}

export const readClientStatus = async (id: number): Promise<{ readClientStatusSuccess: boolean, readClientStatus?: BaseEntity, readClientStatusError?: string }> => {

     const { data, error } = await supabase
          .from('tblClientStatuses')
          .select('*')
          .eq('id', id)
          .single();

     if (error) {
          return { readClientStatusSuccess: false, readClientStatusError: error.message };
     }

     return { readClientStatusSuccess: true, readClientStatus: data ?? undefined };
}

export const updateClientStatus = async (clientStatus: BaseEntity): Promise<{ updateClientStatusSuccess: boolean, updateClientStatus?: BaseEntity, updateClientStatusError?: any }> => {
     const { id, ...clientStatusData } = clientStatus;

     const { data, error } = await supabase
          .from('tblClientStatuses')
          .update(clientStatusData)
          .match({ id });

     if (error) {
          return { updateClientStatusSuccess: false, updateClientStatusError: error };
     }

     return { updateClientStatusSuccess: true, updateClientStatus: data ? data[0] : undefined };
}

export const deleteClientStatus = async (id: number): Promise<{ deleteClientStatusSuccess: boolean, deleteClientStatusError?: string }> => {
     const { error } = await supabase
          .from('tblClientStatuses')
          .delete()
          .eq('id', id);

     if (error) {
          return { deleteClientStatusSuccess: false, deleteClientStatusError: error.message };
     }

     return { deleteClientStatusSuccess: true };
}
