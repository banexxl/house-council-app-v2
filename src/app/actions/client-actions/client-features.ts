import { supabase } from "src/libs/supabase/client"
import { BaseEntity } from "src/types/base-entity"

export const readClientFeatures = async (): Promise<{ readClientFeaturesSuccess: boolean, readClientFeaturesData: BaseEntity[], readClientFeaturesError?: string }> => {
     // Fetch client features
     const { data, error } = await supabase
          .from('tblClient_Features')
          .select('id, name, description')


     if (error) {
          console.error('Error fetching client features:', error)
          return { readClientFeaturesSuccess: false, readClientFeaturesData: [], readClientFeaturesError: error.message }
     }

     return { readClientFeaturesSuccess: true, readClientFeaturesData: data ?? [] }
}

/**
 * Creates a client feature in the database.
 *
 * @param {BaseEntity} clientFeature The client feature to create.
 * @returns {Promise<{ createClientFeatureSuccess: boolean, createClientFeature?: BaseEntity, createClientFeatureError?: string }>} A promise that resolves to an object with a boolean indicating success, the created client feature if successful, and the error message if not successful.
 */
export const createClientFeature = async (clientFeature: BaseEntity): Promise<{ createClientFeatureSuccess: boolean, createClientFeature?: BaseEntity, createClientFeatureError?: string }> => {
     const { data, error } = await supabase
          .from('tblClient_Features')
          .insert(clientFeature)
          .select()
          .single()

     if (error) {
          return { createClientFeatureSuccess: false, createClientFeatureError: error.message }
     }

     return { createClientFeatureSuccess: true, createClientFeature: data }
}

export const updateClientFeature = async (clientFeature: BaseEntity): Promise<{ updateClientFeatureSuccess: boolean, updateClientFeature?: BaseEntity, updateClientFeatureError?: string }> => {
     const { id, ...clientFeatureData } = clientFeature

     const { data, error } = await supabase
          .from('tblClient_Features')
          .update(clientFeatureData)
          .match({ id })
          .select()
          .single()

     if (error) {
          return { updateClientFeatureSuccess: false, updateClientFeatureError: error.message }
     }

     return { updateClientFeatureSuccess: true, updateClientFeature: data }
}

export const deleteClientFeature = async (id: number): Promise<{ deleteClientFeatureSuccess: boolean, deleteClientFeatureError?: string }> => {
     const { error } = await supabase
          .from('tblClient_Features')
          .delete()
          .eq('id', id)

     if (error) {
          return { deleteClientFeatureSuccess: false, deleteClientFeatureError: error.message }
     }

     return { deleteClientFeatureSuccess: true }
}

