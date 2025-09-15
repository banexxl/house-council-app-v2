'use server';

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Client } from 'src/types/client';
import { isUUIDv4 } from 'src/utils/uuid';
import { validate as isUUID } from 'uuid';

// --- Supabase Auth Actions for Client Management ---
export const sendPasswordRecoveryEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: process.env.NEXT_PUBLIC_SUPABASE_PASSWORD_RECOVERY_REDIRECT_URL,
     });

     if (error) return { success: false, error: error.message };
     return { success: true };
};

export const sendMagicLink = async (email: string): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.auth.signInWithOtp({
          email,
          options: {
               emailRedirectTo: process.env.NEXT_PUBLIC_SUPABASE_INVITE_REDIRECT_URL,
          },
     });

     if (error) return { success: false, error: error.message };
     return { success: true };
};

export const removeAllMfaFactors = async (userId: string): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     // List all factors for the user
     const { data: factors, error: listError } = await supabase.auth.admin.mfa.listFactors({ userId });
     if (listError) return { success: false, error: listError.message };
     if (!factors || !Array.isArray(factors.factors)) return { success: true };
     let lastError = null;
     for (const factor of factors.factors) {
          const { error } = await supabase.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
          if (error) lastError = error;
     }
     if (lastError) return { success: false, error: lastError.message };
     return { success: true };
};

export const banUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     // Mark user as banned in user_metadata (Supabase does not support a direct ban flag)
     const { error } = await supabase.auth.admin.updateUserById(userId, {
          app_metadata: {
               banned: true,
               ban_reason: 'Violation of terms of service',
          },
          ban_duration: '24h',
          email_confirm: true, // Optional: prevent login until email is confirmed
     });

     if (error) return { success: false, error: error.message };

     await supabase.auth.admin.signOut(userId);

     return { success: true };
};

export const unbanUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const { error } = await supabase.auth.admin.updateUserById(userId, {
          app_metadata: {
               banned: false,
               ban_reason: null,
          },
          ban_duration: '0s',
          email_confirm: false,
     });

     if (error) return { success: false, error: error.message };

     return { success: true };
};
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
     const adminSupabase = await useServerSideSupabaseAnonClient();
     const { id, unassigned_location_id, ...clientData } = client;

     if (id && id !== '') {
          // === UPDATE ===
          const { data, error: updateError } = await adminSupabase
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
                    user_id: id,
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
               user_id: id,
          });

          if (unassigned_location_id) {
               // First, fetch the building location by unassigned_location_id
               const { data: buildingLocation, error: fetchError } = await adminSupabase
                    .from('tblBuildingLocations')
                    .select('*')
                    .eq('id', unassigned_location_id)
                    .single();

               if (fetchError || !buildingLocation) {
                    await logServerAction({
                         action: 'Fetch Unassigned Location - Failed',
                         duration_ms: 0,
                         error: fetchError?.message || 'Not found',
                         payload: { clientId: id, unassignedLocationId: unassigned_location_id },
                         status: 'fail',
                         type: 'action',
                         user_id: id,
                    });
                    return { saveClientActionSuccess: false, saveClientActionError: fetchError || 'Unassigned location not found' };
               }

               // Reassign unassigned location to the client
               const { error: reassignError } = await adminSupabase
                    .from('tblBuildingLocations')
                    .update({ client_id: id })
                    .eq('id', unassigned_location_id);

               if (reassignError) {
                    await logServerAction({
                         action: 'Reassign Unassigned Locations - Failed',
                         duration_ms: 0,
                         error: reassignError.message,
                         payload: { clientId: id, unassignedLocationId: unassigned_location_id },
                         status: 'fail',
                         type: 'action',
                         user_id: id,
                    });
                    return { saveClientActionSuccess: false, saveClientActionError: reassignError };
               }
          }

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
                    user_id: null,
               });

               return {
                    saveClientActionSuccess: false,
                    saveClientActionError: inviteError?.message ?? 'Failed to invite auth user',
               };
          }

          const { data, error: insertError } = await adminSupabase
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
     const bucket = process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;

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

export const resetPasswordWithOldPassword = async (email: string, oldPassword: string, newPassword: string): Promise<{ success: boolean, error?: string }> => {

     const startTime = Date.now();

     let userId = null;

     const supabase = await useServerSideSupabaseAnonClient();

     const { data: user, error: userError } = await supabase
          .from('tblClients')
          .select('*')
          .eq('email', email)
          .single();

     userId = user?.id || null;

     if (userError || !user) {
          await logServerAction({
               user_id: null,
               action: 'Reset password - user not found',
               payload: { email },
               status: 'fail',
               error: userError?.message || 'User not found',
               duration_ms: Date.now() - startTime,
               type: 'auth'
          });

          return {
               success: false,
               error: "User not found with the provided email address.",
          }
     }

     if (!email || !email.includes("@") || !newPassword || !oldPassword) {

          await logServerAction({
               user_id: null,
               action: 'Reset password - invalid input',
               payload: {},
               status: 'fail',
               error: '',
               duration_ms: Date.now() - startTime,
               type: 'auth'
          })

          return {
               success: false,
               error: "Please enter a valid email address and old and new passwords.",
          }
     }

     try {
          // Get the current session
          const { data: { session }, error: sessionError, } = await supabase.auth.getSession()

          if (sessionError || !session) {
               return {
                    success: false,
                    error: sessionError?.message || "No active session found",
               }
          }

          // Check if the old password is correct
          const { data: signedInUser, error: signInError } = await supabase.auth.signInWithPassword({ email: email, password: oldPassword })

          if (signInError) {
               logServerAction({
                    user_id: null,
                    action: 'Reset password - old password incorrect',
                    payload: { email },
                    status: 'fail',
                    error: signInError.message,
                    duration_ms: Date.now() - startTime,
                    type: 'auth'
               })
               return {
                    success: false,
                    error: signInError?.message || "Failed to reset password",
               }
          }


          // Update the user's password
          const { error } = await supabase.auth.updateUser({ password: newPassword })

          if (error) {
               let errorMsg = "Failed to reset password";
               // Supabase error codes for password update
               // See: https://github.com/supabase/gotrue-js/blob/master/src/lib/errors.ts
               switch (error.status) {
                    case 422:
                         // Weak password
                         errorMsg = "Password is too weak. Please choose a stronger password.";
                         break;
                    case 400:
                         // Invalid password or request
                         if (error.message && error.message.toLowerCase().includes('password')) {
                              errorMsg = error.message;
                         } else {
                              errorMsg = "Invalid password or request.";
                         }
                         break;
                    case 429:
                         errorMsg = "Too many requests. Please try again later.";
                         break;
                    case 401:
                         errorMsg = "Unauthorized. Please log in again.";
                         break;
                    case 403:
                         errorMsg = "You do not have permission to perform this action.";
                         break;
                    default:
                         if (error.message) {
                              errorMsg = error.message;
                         }
                         break;
               }
               logServerAction({
                    user_id: null,
                    action: 'Reset password - password update failed',
                    payload: { email },
                    status: 'fail',
                    error: error.message,
                    duration_ms: Date.now() - startTime,
                    type: 'auth'
               })
               return {
                    success: false,
                    error: errorMsg,
               }
          }

          logServerAction({
               user_id: userId,
               action: 'Reset password - success',
               payload: { email },
               status: 'success',
               error: '',
               duration_ms: 0,
               type: 'action'
          })

          return {
               success: true,
          }
     } catch (error: any) {
          logServerAction({
               user_id: null,
               action: 'Reset password - error',
               payload: { email },
               status: 'fail',
               error: error.message,
               duration_ms: Date.now() - startTime,
               type: 'auth'
          })
          return {
               success: false,
               error: error?.message || "Failed to reset password",
          }
     }
}

// Returns true if the provided userId corresponds to a Client record; false if tenant or not found.
export const isClientUserId = async (userId: string): Promise<boolean> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const { data: client, error: clientError } = await supabase.from('tblClients').select('id').eq('user_id', userId).single();
     if (client && isUUIDv4(client.id) && !clientError) return true;
     const { data: clientMember, error: clientMemberError } = await supabase.from('tblClientMemebers').select('id').eq('user_id', userId).single();
     if (clientMember && isUUIDv4(clientMember.id) && !clientMemberError) return true;
     const { data: tenant, error: tenantError } = await supabase.from('tblTenants').select('id').eq('user_id', userId).single();
     if (tenant && isUUIDv4(tenant.id) && !tenantError) return false;
     return !!tenant;
}


