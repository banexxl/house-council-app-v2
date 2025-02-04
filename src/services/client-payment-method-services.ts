import { supabase } from "src/libs/supabase/client";
import { ClientPaymentMethod } from "src/types/payment-method";

export const createClientPaymentMethod = async (clientPaymentMethod: ClientPaymentMethod): Promise<{ createClientPaymentMethodSuccess: boolean, createClientPaymentMethod?: ClientPaymentMethod, createClientPaymentMethodError?: any }> => {
     const { data, error } = await supabase
          .from('tblClientPaymentMethods')
          .insert(clientPaymentMethod);

     if (error) {
          return { createClientPaymentMethodSuccess: false, createClientPaymentMethodError: error };
     }

     return { createClientPaymentMethodSuccess: true, createClientPaymentMethod: data ? data[0] : undefined };
}

export const readClientPaymentMethod = async (id: number): Promise<{ readClientPaymentMethodSuccess: boolean, readClientPaymentMethod?: ClientPaymentMethod, readClientPaymentMethodError?: string }> => {

     const { data, error } = await supabase
          .from('tblClientPaymentMethods')
          .select('*')
          .eq('id', id)
          .single();

     if (error) {
          return { readClientPaymentMethodSuccess: false, readClientPaymentMethodError: error.message };
     }

     return { readClientPaymentMethodSuccess: true, readClientPaymentMethod: data ?? undefined };
}

export const updateClientPaymentMethod = async (id: number, clientPaymentMethod: ClientPaymentMethod): Promise<{ updateClientPaymentMethodSuccess: boolean, updateClientPaymentMethod?: ClientPaymentMethod, updateClientPaymentMethodError?: any }> => {
     const { data, error } = await supabase
          .from('tblClientPaymentMethods')
          .update(clientPaymentMethod)
          .eq('id', id)
          .single();

     if (error) {
          return { updateClientPaymentMethodSuccess: false, updateClientPaymentMethodError: error };
     }

     return { updateClientPaymentMethodSuccess: true, updateClientPaymentMethod: data ?? undefined };
}

export const deleteClientPaymentMethod = async (id: number): Promise<{ deleteClientPaymentMethodSuccess: boolean, deleteClientPaymentMethodError?: string }> => {
     const { error } = await supabase
          .from('tblClientPaymentMethods')
          .delete()
          .eq('id', id);

     if (error) {
          return { deleteClientPaymentMethodSuccess: false, deleteClientPaymentMethodError: error.message };
     }

     return { deleteClientPaymentMethodSuccess: true };
}

export const fetchClientPaymentMethods = async () => {
     const { data, error } = await supabase
          .from('tblClientPaymentMethods')
          .select('*');
     if (error) {
          console.error('Error fetching client payment methods:', error);
          return [];
     }

     return data
}

