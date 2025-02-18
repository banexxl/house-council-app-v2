import { supabase } from "src/libs/supabase/client"
import { BaseEntity } from "../base-entity-services"

export const readClientPaymentMethods = async (): Promise<{ readClientPaymentMethodsSuccess: boolean, readClientPaymentMethodsData: BaseEntity[], readClientPaymentMethodsError?: string }> => {
     // Fetch client payment methods
     const { data, error } = await supabase
          .from('tblClientPaymentMethods')
          .select('id, name, description')

     if (error) {
          console.error('Error fetching client payment methods:', error)
          return { readClientPaymentMethodsSuccess: false, readClientPaymentMethodsData: [], readClientPaymentMethodsError: error.message }
     }

     return { readClientPaymentMethodsSuccess: true, readClientPaymentMethodsData: data ?? [] }
}

export const createClientPaymentMethod = async (clientPaymentMethod: BaseEntity): Promise<{ createClientPaymentMethodSuccess: boolean, createClientPaymentMethod?: BaseEntity, createClientPaymentMethodError?: string }> => {
     const { data, error } = await supabase
          .from('tblClientPaymentMethods')
          .insert(clientPaymentMethod)
          .select()
          .single()

     if (error) {
          return { createClientPaymentMethodSuccess: false, createClientPaymentMethodError: error.message }
     }

     return { createClientPaymentMethodSuccess: true, createClientPaymentMethod: data }
}

export const updateClientPaymentMethod = async (clientPaymentMethod: BaseEntity): Promise<{ updateClientPaymentMethodSuccess: boolean, updateClientPaymentMethod?: BaseEntity, updateClientPaymentMethodError?: string }> => {
     const { id, ...clientPaymentMethodData } = clientPaymentMethod

     const { data, error } = await supabase
          .from('tblClientPaymentMethods')
          .update(clientPaymentMethodData)
          .match({ id })
          .select()
          .single()

     if (error) {
          return { updateClientPaymentMethodSuccess: false, updateClientPaymentMethodError: error.message }
     }

     return { updateClientPaymentMethodSuccess: true, updateClientPaymentMethod: data }
}

export const deleteClientPaymentMethod = async (id: number): Promise<{ deleteClientPaymentMethodSuccess: boolean, deleteClientPaymentMethodError?: string }> => {
     const { error } = await supabase
          .from('tblClientPaymentMethods')
          .delete()
          .eq('id', id)

     if (error) {
          return { deleteClientPaymentMethodSuccess: false, deleteClientPaymentMethodError: error.message }
     }

     return { deleteClientPaymentMethodSuccess: true }
}
