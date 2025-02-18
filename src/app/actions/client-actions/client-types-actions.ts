import { supabase } from "src/libs/supabase/client"
import { BaseEntity } from "../base-entity-services"

export const readClientTypes = async (): Promise<{ readClientTypesSuccess: boolean, readClientTypesData: BaseEntity[], readClientTypesError?: string }> => {
     // Fetch client types
     const { data, error } = await supabase
          .from('tblClientTypes')
          .select('id, name, description')

     if (error) {
          console.error('Error fetching client types:', error)
          return { readClientTypesSuccess: false, readClientTypesData: [], readClientTypesError: error.message }
     }

     return { readClientTypesSuccess: true, readClientTypesData: data ?? [] }
}

export const createClientType = async (clientType: BaseEntity): Promise<{ createClientTypeSuccess: boolean, createClientType?: BaseEntity, createClientTypeError?: string }> => {
     const { data, error } = await supabase
          .from('tblClientTypes')
          .insert(clientType)
          .select()
          .single()

     if (error) {
          return { createClientTypeSuccess: false, createClientTypeError: error.message }
     }

     return { createClientTypeSuccess: true, createClientType: data }
}

export const updateClientType = async (clientType: BaseEntity): Promise<{ updateClientTypeSuccess: boolean, updateClientType?: BaseEntity, updateClientTypeError?: string }> => {
     const { id, ...clientTypeData } = clientType

     const { data, error } = await supabase
          .from('tblClientTypes')
          .update(clientTypeData)
          .match({ id })
          .select()
          .single()

     if (error) {
          return { updateClientTypeSuccess: false, updateClientTypeError: error.message }
     }

     return { updateClientTypeSuccess: true, updateClientType: data }
}

export const deleteClientType = async (id: number): Promise<{ deleteClientTypeSuccess: boolean, deleteClientTypeError?: string }> => {
     const { error } = await supabase
          .from('tblClientTypes')
          .delete()
          .eq('id', id)

     if (error) {
          return { deleteClientTypeSuccess: false, deleteClientTypeError: error.message }
     }

     return { deleteClientTypeSuccess: true }
}

