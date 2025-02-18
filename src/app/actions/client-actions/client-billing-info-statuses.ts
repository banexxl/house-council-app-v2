import { supabase } from "src/libs/supabase/client"
import { BaseEntity } from "../base-entity-services"

export const readClientBillingInformationStatuses = async (): Promise<{ readClientBillingInformationStatusesSuccess: boolean, readClientBillingInformationStatusesData: BaseEntity[], readClientBillingInformationStatusesError?: string }> => {
     // Fetch client billing information statuses
     const { data, error } = await supabase
          .from('tblClientBillingInformationStatuses')
          .select('id, name, description')


     if (error) {
          console.error('Error fetching client billing information statuses:', error)
          return { readClientBillingInformationStatusesSuccess: false, readClientBillingInformationStatusesData: [], readClientBillingInformationStatusesError: error.message }
     }

     return { readClientBillingInformationStatusesSuccess: true, readClientBillingInformationStatusesData: data ?? [] }
}

export const createClientBillingInformationStatus = async (clientBillingInformationStatus: BaseEntity): Promise<{ createClientBillingInformationStatusSuccess: boolean, createClientBillingInformationStatus?: BaseEntity, createClientBillingInformationStatusError?: string }> => {
     const { data, error } = await supabase
          .from('tblClientBillingInformationStatuses')
          .insert(clientBillingInformationStatus)
          .select()
          .single()

     if (error) {
          return { createClientBillingInformationStatusSuccess: false, createClientBillingInformationStatusError: error.message }
     }

     return { createClientBillingInformationStatusSuccess: true, createClientBillingInformationStatus: data }
}

export const updateClientBillingInformationStatus = async (clientBillingInformationStatus: BaseEntity): Promise<{ updateClientBillingInformationStatusSuccess: boolean, updateClientBillingInformationStatus?: BaseEntity, updateClientBillingInformationStatusError?: string }> => {
     const { id, ...clientBillingInformationStatusData } = clientBillingInformationStatus

     const { data, error } = await supabase
          .from('tblClientBillingInformationStatuses')
          .update(clientBillingInformationStatusData)
          .match({ id })
          .select()
          .single()

     if (error) {
          return { updateClientBillingInformationStatusSuccess: false, updateClientBillingInformationStatusError: error.message }
     }

     return { updateClientBillingInformationStatusSuccess: true, updateClientBillingInformationStatus: data }
}

export const deleteClientBillingInformationStatus = async (id: number): Promise<{ deleteClientBillingInformationStatusSuccess: boolean, deleteClientBillingInformationStatusError?: string }> => {
     const { error } = await supabase
          .from('tblClientBillingInformationStatuses')
          .delete()
          .eq('id', id)

     if (error) {
          return { deleteClientBillingInformationStatusSuccess: false, deleteClientBillingInformationStatusError: error.message }
     }

     return { deleteClientBillingInformationStatusSuccess: true }
}

