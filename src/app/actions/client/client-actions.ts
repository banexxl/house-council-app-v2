'use server';

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Client } from 'src/types/client';
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

export const createOrUpdateClientAction = async (
     client: Client
): Promise<{
     saveClientActionSuccess: boolean;
     saveClientActionData?: Client;
     saveClientActionError?: any;
}> => {
     const anonSupabase = await useServerSideSupabaseAnonClient();
     const adminSupabase = await useServerSideSupabaseServiceRoleClient();
     const { id, ...clientData } = client;

     if (id && id !== '') {
          // === UPDATE ===
          const { data, error: updateError } = await anonSupabase
               .from('tblClients')
               .update({ ...clientData, updated_at: new Date().toISOString() })
               .eq('id', id)
               .select()
               .single();

          if (updateError) {
               await logServerAction({
                    action: 'Update Client - Failed',
                    duration_ms: 0,
                    error: updateError.message,
                    payload: { clientId: id, clientData },
                    status: 'fail',
                    type: 'action',
                    user_id: '',
               });
               return { saveClientActionSuccess: false, saveClientActionError: updateError };
          }

          await logServerAction({
               action: 'Update Client - Success',
               duration_ms: 0,
               error: '',
               payload: { clientId: id, clientData },
               status: 'success',
               type: 'action',
               user_id: '',
          });

          revalidatePath(`/dashboard/clients/${id}`);

          return {
               saveClientActionSuccess: true,
               saveClientActionData: data as Client,
          };
     } else {
          // === CREATE ===
          const { data: invitedUser, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(clientData.email, {
               redirectTo: process.env.NEXT_PUBLIC_SUPABASE_INVITE_REDIRECT_URL,
          });

          if (inviteError || !invitedUser?.user) {
               await logServerAction({
                    action: 'Invite Auth User - Failed',
                    duration_ms: 0,
                    error: inviteError?.message ?? 'Unknown error',
                    payload: { email: clientData.email },
                    status: 'fail',
                    type: 'auth',
                    user_id: '',
               });

               return {
                    saveClientActionSuccess: false,
                    saveClientActionError: inviteError?.message ?? 'Failed to invite auth user',
               };
          }

          const { data, error: insertError } = await anonSupabase
               .from('tblClients')
               .insert({ ...clientData, user_id: invitedUser.user.id })
               .select()
               .single();

          if (insertError) {
               await logServerAction({
                    action: 'Create Client - Failed',
                    duration_ms: 0,
                    error: insertError.message,
                    payload: { clientData },
                    status: 'fail',
                    type: 'action',
                    user_id: invitedUser.user.id,
               });
               return { saveClientActionSuccess: false, saveClientActionError: insertError };
          }

          await logServerAction({
               action: 'Create Client - Success',
               duration_ms: 0,
               error: '',
               payload: { clientData },
               status: 'success',
               type: 'action',
               user_id: invitedUser.user.id,
          });

          revalidatePath(`/dashboard/clients/${data.id}`);

          return {
               saveClientActionSuccess: true,
               saveClientActionData: data as Client,
          };
     }
};

export const readAllClientsAction = async (): Promise<{
     getAllClientsActionSuccess: boolean;
     getAllClientsActionData?: Client[];
     getAllClientsActionError?: string;
}> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data, error } = await supabase.from('tblClients').select('*');
          if (error) throw error;

          return {
               getAllClientsActionSuccess: true,
               getAllClientsActionData: data as Client[],
          };
     } catch (error) {
          return {
               getAllClientsActionSuccess: false,
               getAllClientsActionData: [],
               getAllClientsActionError: 'Failed to fetch clients',
          };
     }
};

export const readClientByIdAction = async (
     clientId: string
): Promise<{
     getClientByIdActionSuccess: boolean;
     getClientByIdActionData?: Client;
     getClientByIdActionError?: string;
}> => {
     if (!isUUID(clientId)) return { getClientByIdActionSuccess: false, getClientByIdActionError: 'Invalid client ID format' };

     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data, error } = await supabase.from('tblClients').select('*').eq('id', clientId).single();
          if (error) throw error;
          if (!data) throw new Error('Client not found');

          return {
               getClientByIdActionSuccess: true,
               getClientByIdActionData: data as Client,
          };
     } catch (error) {
          return {
               getClientByIdActionSuccess: false,
               getClientByIdActionError: 'Failed to fetch client',
          };
     }
};

export const deleteClientByIDsAction = async (
     ids: string[]
): Promise<{ deleteClientByIDsActionSuccess: boolean; deleteClientByIDsActionError?: string }> => {

     const anonSupabase = await useServerSideSupabaseAnonClient();
     const adminSupabase = await useServerSideSupabaseServiceRoleClient();

     try {
          // Fetch user_ids before deleting clients
          const { data: clientsToDelete, error: fetchError } = await anonSupabase
               .from('tblClients')
               .select('user_id')
               .in('id', ids);

          if (fetchError) throw fetchError;

          const userIdsToDelete = clientsToDelete.map((c) => c.user_id).filter(Boolean);

          // Delete from tblClients
          const { error: deleteClientError } = await anonSupabase.from('tblClients').delete().in('id', ids);
          if (deleteClientError) throw deleteClientError;

          // Delete from auth.users
          const failedDeletes: string[] = [];
          for (const userId of userIdsToDelete) {
               const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(userId);
               if (deleteUserError) failedDeletes.push(userId);
          }

          revalidatePath('/dashboard/clients');

          if (failedDeletes.length > 0) {
               return {
                    deleteClientByIDsActionSuccess: false,
                    deleteClientByIDsActionError: `Failed to delete auth.users for: ${failedDeletes.join(', ')}`,
               };
          }

          return { deleteClientByIDsActionSuccess: true };
     } catch (error: any) {
          return {
               deleteClientByIDsActionSuccess: false,
               deleteClientByIDsActionError: error.message,
          };
     }
};

export const readClientByEmailAction = async (
     email: string
): Promise<{ getClientByEmailActionSuccess: boolean; getClientByEmailActionData?: Client }> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data, error } = await supabase.from('tblClients').select().eq('email', email).single();
          if (error) throw error;
          return { getClientByEmailActionSuccess: true, getClientByEmailActionData: data };
     } catch (error) {
          return { getClientByEmailActionSuccess: false };
     }
};

export const uploadClientLogoAndGetUrl = async (
     file: File,
     client: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const bucket = process.env.SUPABASE_S3_CLIENT_IMAGES_BUCKET!;

     try {
          const encodedFilePath = ['Clients', sanitizeSegmentForS3(client), 'logo', sanitizeSegmentForS3(file.name)].join('/');

          const { error: uploadError } = await supabase.storage.from(bucket).upload(encodedFilePath, file, {
               cacheControl: '3600',
               upsert: true,
          });

          if (uploadError) {
               return {
                    success: false,
                    error: `${uploadError.message} for file ${file.name}`,
               };
          }

          const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(encodedFilePath);
          const imageUrl = publicUrlData?.publicUrl;

          if (!imageUrl) {
               return { success: false, error: 'Failed to retrieve public URL' };
          }

          return { success: true, url: imageUrl };
     } catch (error: any) {
          return { success: false, error: error.message };
     }
};
