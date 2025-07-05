'use server'

import { revalidatePath } from "next/cache"
import { useServerSideSupabaseServiceRoleClient } from "src/libs/supabase/sb-server"
import { logServerAction } from "src/libs/supabase/server-logging";
import { Client } from "src/types/client"
import { validate as isUUID } from 'uuid';


// Helper to sanitize file paths for S3
const sanitizeSegmentForS3 = (segment: string): string => {
     return segment
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9-_.]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '');
};

export const createOrUpdateClientAction = async (client: Client): Promise<{
     saveClientActionSuccess: boolean
     saveClientActionData?: Client
     saveClientActionError?: any
}> => {
     const supabase = await useServerSideSupabaseServiceRoleClient();
     const { id, ...clientData } = client

     if (id && id !== "") {
          // Update existing client
          const { data, error: updateError } = await supabase.from("tblClients").update({ ...clientData, updated_at: new Date().toISOString() }).eq("id", id).select().single()
          if (updateError) {

               await logServerAction({
                    action: 'Update Client - Failed',
                    duration_ms: 0,
                    error: updateError.message,
                    payload: { clientId: id, clientData },
                    status: 'fail',
                    type: 'action',
                    user_id: '',
               })
               return { saveClientActionSuccess: false, saveClientActionError: updateError }
          }
          await logServerAction({
               action: 'Update Client - Success',
               duration_ms: 0,
               error: '',
               payload: { clientId: id, clientData },
               status: 'success',
               type: 'action',
               user_id: '',
          })
          revalidatePath(`/dashboard/clients/${id}`)
          return {
               saveClientActionSuccess: true,
               saveClientActionData: data as Client,
          }
     } else {
          // Insert new client
          const { data, error: insertError } = await supabase.from("tblClients").insert(clientData).select().single()
          if (insertError) {
               await logServerAction({
                    action: 'Create Client - Failed',
                    duration_ms: 0,
                    error: insertError.message,
                    payload: { clientData },
                    status: 'fail',
                    type: 'action',
                    user_id: '',
               })
               return { saveClientActionSuccess: false, saveClientActionError: insertError }
          }
          await logServerAction({
               action: 'Create Client - Success',
               duration_ms: 0,
               error: '',
               payload: { clientData },
               status: 'success',
               type: 'action',
               user_id: '',
          })
          revalidatePath(`/dashboard/clients/${data.id}`)
          return {
               saveClientActionSuccess: true,
               saveClientActionData: data as Client,
          }
     }
}

export const readAllClientsAction = async (): Promise<{
     getAllClientsActionSuccess: boolean;
     getAllClientsActionData?: Client[];
     getAllClientsActionError?: string;
}> => {

     const supabase = await useServerSideSupabaseServiceRoleClient();

     try {
          const { data, error } = await supabase
               .from("tblClients")
               .select(`*`);

          if (error) throw error;

          return {
               getAllClientsActionSuccess: true,
               getAllClientsActionData: data as Client[],
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

     const time = Date.now();
     if (!isUUID(clientId)) return { getClientByIdActionSuccess: false, getClientByIdActionError: "Invalid client ID format" };

     const supabase = await useServerSideSupabaseServiceRoleClient();

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

          return {
               getClientByIdActionSuccess: true,
               getClientByIdActionData: data as Client,
          }

     } catch (error) {
          console.error("Error fetching client:", error)
          return {
               getClientByIdActionSuccess: false,
               getClientByIdActionError: "Failed to fetch client",
          }
     }
}

export const deleteClientByIDsAction = async (ids: string[]): Promise<{
     deleteClientByIDsActionSuccess: boolean,
     deleteClientByIDsActionError?: string
}> => {

     const supabase = await useServerSideSupabaseServiceRoleClient();

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

export const readClientByEmailAction = async (email: string): Promise<{
     getClientByEmailActionSuccess: boolean,
     getClientByEmailActionData?: Client
}> => {

     const supabase = await useServerSideSupabaseServiceRoleClient();

     try {
          const { data, error } = await supabase.from('tblClients').select().eq('email', email).single()
          if (error) throw error
          return { getClientByEmailActionSuccess: true, getClientByEmailActionData: data }
     } catch (error) {
          console.error('Error fetching client by email:', error)
          return { getClientByEmailActionSuccess: false }
     }
}

export const uploadClientLogoAndGetUrl = async (
     file: File,
     client: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
     const supabase = await useServerSideSupabaseServiceRoleClient();
     const bucket = process.env.SUPABASE_S3_CLIENT_IMAGES_BUCKET!;

     try {
          const encodedFilePath = [
               'Clients',
               sanitizeSegmentForS3(client),
               'logo',
               sanitizeSegmentForS3(file.name),
          ].join('/');

          const { data, error: uploadError } = await supabase.storage
               .from(bucket)
               .upload(encodedFilePath, file, {
                    cacheControl: '3600',
                    upsert: true,
               });

          if (uploadError) {
               await logServerAction({
                    action: 'Upload Client Logo - Failed',
                    duration_ms: 0,
                    error: uploadError.message,
                    payload: { client },
                    status: 'fail',
                    type: 'action',
                    user_id: '',
               });
               return {
                    success: false,
                    error: `${uploadError.message} for file ${file.name}`,
               };
          }

          const { data: publicUrlData } = supabase.storage
               .from(bucket)
               .getPublicUrl(encodedFilePath);

          const imageUrl = publicUrlData?.publicUrl;

          if (!imageUrl) {
               await logServerAction({
                    action: 'Upload Client Logo - Failed to get public URL',
                    duration_ms: 0,
                    error: 'Failed to retrieve public URL',
                    payload: { client },
                    status: 'fail',
                    type: 'action',
                    user_id: '',
               });
               return { success: false, error: 'Failed to retrieve public URL' };
          }

          await logServerAction({
               action: 'Upload Client Logo - Success',
               duration_ms: 0,
               error: '',
               payload: { imageUrl, client },
               status: 'success',
               type: 'action',
               user_id: '',
          });

          return { success: true, url: imageUrl };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
};
