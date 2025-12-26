'use server';

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Client } from 'src/types/client';
import { Tenant } from 'src/types/tenant';
import { isUUIDv4 } from 'src/utils/uuid';
import { validate as isUUID } from 'uuid';
import { TABLES } from 'src/libs/supabase/tables';
import log from 'src/utils/logger';
import { getViewer } from 'src/libs/supabase/server-auth';

export type ClientBuildingOption = {
     id: string;
     label: string;
     street_address?: string;
     city?: string;
};

// --- Supabase Auth Actions for Client Management ---
export const sendPasswordRecoveryEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseServiceRoleClient();
     const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: process.env.NEXT_PUBLIC_SUPABASE_PASSWORD_RECOVERY_REDIRECT_URL,
     });

     if (error) {
          log(`sendPasswordRecoveryEmail error: ${error.message}`, 'error');
          return { success: false, error: error.message };
     }
     return { success: true };
};

export const sendMagicLink = async (email: string): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseServiceRoleClient();
     const { data, error } = await supabase.auth.signInWithOtp({
          email,
          // options: {
          //      emailRedirectTo: process.env.NEXT_PUBLIC_SUPABASE_INVITE_REDIRECT_URL,
          // },
     });

     if (error) {
          log(`sendMagicLink error: ${error.message}`, 'error');
          return { success: false, error: error.message };
     }
     return { success: true };
};

export const removeAllMfaFactors = async (userId: string): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseServiceRoleClient();
     // List all factors for the user
     const { data: factors, error: listError } = await supabase.auth.admin.mfa.listFactors({ userId });
     if (listError) {
          log(`removeAllMfaFactors list error for user ${userId}: ${listError.message}`, 'error');
          return { success: false, error: listError.message };
     }
     if (!factors || !Array.isArray(factors.factors)) return { success: true };
     let lastError = null;
     for (const factor of factors.factors) {
          const { error } = await supabase.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
          if (error) {
               log(`removeAllMfaFactors delete error for factor ${factor.id} user ${userId}: ${error.message}`, 'error');
               lastError = error;
          }
     }
     if (lastError) return { success: false, error: lastError.message };
     return { success: true };
};

export const banUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseServiceRoleClient();
     // Mark user as banned in user_metadata (Supabase does not support a direct ban flag)
     const { error } = await supabase.auth.admin.updateUserById(userId, {
          app_metadata: {
               banned: true,
               ban_reason: 'Violation of terms of service',
          },
          ban_duration: '24h',
          email_confirm: true, // Optional: prevent login until email is confirmed
     });

     if (error) {
          log(`banUser error for user ${userId}: ${error.message}`, 'error');
          return { success: false, error: error.message };
     }
     return { success: true };
};

export const unbanUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseServiceRoleClient();
     const { error } = await supabase.auth.admin.updateUserById(userId, {
          app_metadata: {
               banned: false,
               ban_reason: null,
          },
          ban_duration: '0s',
          email_confirm: false,
     });

     if (error) {
          log(`unbanUser error for user ${userId}: ${error.message}`, 'error');
          return { success: false, error: error.message };
     }

     return { success: true };
};

export const createOrUpdateClientAction = async (
     client: Partial<Client>
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
               .from(TABLES.CLIENTS)
               .update({ ...clientData, updated_at: new Date().toISOString() })
               .eq('id', id)
               .select()
               .single();

          if (updateError) {
               log(`createOrUpdateClientAction update error for client ${id}: ${updateError.message}`, 'error');
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
          revalidatePath(`/dashboard/account`);
          await logServerAction({
               action: 'Update Client - Success',
               duration_ms: 0,
               error: '',
               payload: { clientId: id, clientData },
               status: 'success',
               type: 'action',
               user_id: id,
          });

          // Sync tenant profile for client (name/email/phone)
          const profilePayload = {
               first_name: clientData.contact_person || clientData.name || '',
               last_name: '',
               email: clientData.email || '',
               phone_number: clientData.phone || clientData.mobile_phone || '',
          };
          await adminSupabase
               .from(TABLES.TENANT_PROFILES)
               .upsert({
                    id: id, // use client id as profile id for consistency
                    tenant_id: id,
                    ...profilePayload,
                    updated_at: new Date().toISOString(),
               }, { onConflict: 'id' });

          if (unassigned_location_id) {
               // First, fetch the building location by unassigned_location_id
               const { data: buildingLocation, error: fetchError } = await adminSupabase
                    .from(TABLES.BUILDING_LOCATIONS)
                    .select('*')
                    .eq('id', unassigned_location_id)
                    .single();

               if (fetchError || !buildingLocation) {
                    log(`createOrUpdateClientAction fetch unassigned location error for client ${id}: ${fetchError?.message || 'Not found'}`, 'error');
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
                    .from(TABLES.BUILDING_LOCATIONS)
                    .update({ client_id: id })
                    .eq('id', unassigned_location_id);

               if (reassignError) {
                    log(`createOrUpdateClientAction reassign error for client ${id}: ${reassignError.message}`, 'error');
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

          return {
               saveClientActionSuccess: true,
               saveClientActionData: data as Client,
          };
     } else {
          // === CREATE ===
          const { data: invitedUser, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(clientData.email!, {
               redirectTo: process.env.NEXT_PUBLIC_SUPABASE_INVITE_REDIRECT_URL,
          });

          if (inviteError || !invitedUser?.user) {
               log(`createOrUpdateClientAction invite error for email ${clientData.email}: ${inviteError?.message ?? 'Unknown error'}`, 'error');
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
               .from(TABLES.CLIENTS)
               .insert({ ...clientData, user_id: invitedUser.user.id })
               .select()
               .single();

          if (insertError) {
               log(`createOrUpdateClientAction insert error for email ${clientData.email}: ${insertError.message}`, 'error');
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

          // Create tenant profile for client
          const profilePayload = {
               id: data.id,
               tenant_id: data.id,
               first_name: clientData.contact_person || clientData.name || '',
               last_name: '',
               email: clientData.email || '',
               phone_number: clientData.phone || clientData.mobile_phone || '',
               created_at: new Date().toISOString(),
               updated_at: new Date().toISOString(),
          };
          await adminSupabase.from(TABLES.TENANT_PROFILES).upsert(profilePayload);

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
          const { data, error } = await supabase.from(TABLES.CLIENTS).select('*');
          if (error) throw error;

          return {
               getAllClientsActionSuccess: true,
               getAllClientsActionData: data as Client[],
          };
     } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          log(`readAllClientsAction error: ${message}`, 'error');
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
     if (!isUUID(clientId)) {
          log(`readClientByIdAction invalid ID: ${clientId}`, 'error');
          return { getClientByIdActionSuccess: false, getClientByIdActionError: 'Invalid client ID format' };
     }

     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data, error } = await supabase.from(TABLES.CLIENTS).select('*').eq('id', clientId).single();
          if (error) throw error;
          if (!data) throw new Error('Client not found');

          return {
               getClientByIdActionSuccess: true,
               getClientByIdActionData: data as Client,
          };
     } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          log(`readClientByIdAction error for id ${clientId}: ${message}`, 'error');
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
               .from(TABLES.CLIENTS)
               .select('user_id')
               .in('id', ids);

          if (fetchError) {
               log(`deleteClientByIDsAction fetch error for ids ${ids.join(', ')}: ${fetchError.message}`, 'error');
               throw fetchError;
          }

          const userIdsToDelete = clientsToDelete.map((c) => c.user_id).filter(Boolean);

          // Delete from tblBuildings
          const { error: deleteBuildings } = await anonSupabase.from(TABLES.BUILDINGS).delete().in('client_id', ids);
          if (deleteBuildings) {
               log(`Error deleting clients with IDs: ${ids.join(', ')}: ${deleteBuildings.message}`, 'error');
               throw deleteBuildings
          };

          // Delete from tblClients
          const { error: deleteClientError } = await anonSupabase.from(TABLES.CLIENTS).delete().in('id', ids);
          if (deleteClientError) {
               log(`Error deleting clients with IDs: ${ids.join(', ')}: ${deleteClientError.message}`, 'error');
               throw deleteClientError
          };

          // Delete from auth.users
          const failedDeletes: string[] = [];
          for (const userId of userIdsToDelete) {
               const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(userId);
               if (deleteUserError) {
                    log(`Error deleting auth.user with ID: ${userId}: ${deleteUserError.message}`, 'error');
                    failedDeletes.push(userId);
               }
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
          log(`deleteClientByIDsAction error for ids ${ids.join(', ')}: ${error?.message || 'Unknown error'}`, 'error');
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
          const { data, error } = await supabase.from(TABLES.CLIENTS).select().eq('email', email).single();
          if (error) throw error;
          return { getClientByEmailActionSuccess: true, getClientByEmailActionData: data };
     } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          log(`readClientByEmailAction error for email ${email}: ${message}`, 'error');
          return { getClientByEmailActionSuccess: false };
     }
};

export const resetPasswordWithOldPassword = async (email: string, oldPassword: string, newPassword: string): Promise<{ success: boolean, error?: string }> => {

     const startTime = Date.now();

     let userId = null;

     const supabase = await useServerSideSupabaseAnonClient();

     const { data: user, error: userError } = await supabase
          .from(TABLES.CLIENTS)
          .select('*')
          .eq('email', email)
          .single();

     userId = user?.id || null;

     if (userError || !user) {
          log(`resetPasswordWithOldPassword user lookup error for ${email}: ${userError?.message || 'User not found'}`, 'error');
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

          log(`resetPasswordWithOldPassword invalid input for ${email}`, 'error');
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
               log(`resetPasswordWithOldPassword session error for ${email}: ${sessionError?.message || 'No session'}`, 'error');
               return {
                    success: false,
                    error: sessionError?.message || "No active session found",
               }
          }

          // Check if the old password is correct
          const { data: signedInUser, error: signInError } = await supabase.auth.signInWithPassword({ email: email, password: oldPassword })

          if (signInError) {
               log(`resetPasswordWithOldPassword sign-in error for ${email}: ${signInError.message}`, 'error');
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
               log(`resetPasswordWithOldPassword update error for ${email}: ${error.message}`, 'error');
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
          log(`resetPasswordWithOldPassword unexpected error for ${email}: ${error?.message || 'Unknown error'}`, 'error');
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

export const readAllTenantsFromClientIdAction = async (client_id: string): Promise<{ tenants: Tenant[] }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     if (!isUUID(client_id)) {
          log(`readAllTenantsFromClientIdAction invalid client_id: ${client_id}`, 'error');
          return { tenants: [] };
     }

     try {
          const { data: buildings, error: buildingsError } = await supabase
               .from(TABLES.BUILDINGS)
               .select('id')
               .eq('client_id', client_id);

          if (buildingsError) throw buildingsError;
          const buildingIds = (buildings ?? []).map((b) => b.id).filter(Boolean);
          if (buildingIds.length === 0) return { tenants: [] };

          const { data: apartments, error: apartmentsError } = await supabase
               .from(TABLES.APARTMENTS)
               .select('id')
               .in('building_id', buildingIds);

          if (apartmentsError) throw apartmentsError;
          const apartmentIds = (apartments ?? []).map((a) => a.id).filter(Boolean);
          if (apartmentIds.length === 0) return { tenants: [] };

          const { data: tenants, error: tenantsError } = await supabase
               .from(TABLES.TENANTS)
               .select(`
                    *,
                    apartment:tblApartments (
                         id,
                         apartment_number,
                         building:tblBuildings (
                              id,
                              building_location:tblBuildingLocations!tblBuildings_building_location_fkey (
                                   street_address,
                                   city
                              )
                         )
                    )
               `)
               .in('apartment_id', apartmentIds);
          console.log('tenants', tenants);

          if (tenantsError) {
               log(`readAllTenantsFromClientIdAction tenants error for client_id ${client_id}: ${tenantsError.message}`, 'error');
               throw tenantsError
          };

          return { tenants: (tenants ?? []) as Tenant[] };
     } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          log(`readAllTenantsFromClientIdAction error for client ${client_id}: ${message}`, 'error');
          return { tenants: [] };
     }
}

// --- Social profile helpers for clients ---
const calculateClientProfileProgress = (profile: Partial<{ first_name?: string; last_name?: string; phone_number?: string; bio?: string; avatar_url?: string; cover_image_url?: string; current_city?: string; current_job_title?: string; current_job_company?: string; previous_job_title?: string; previous_job_company?: string; origin_city?: string; quote?: string; }>): number => {
     const fields = [
          'first_name',
          'last_name',
          'phone_number',
          'bio',
          'avatar_url',
          'cover_image_url',
          'current_city',
          'current_job_title',
          'current_job_company',
          'previous_job_title',
          'previous_job_company',
          'origin_city',
          'quote',
     ];
     const completed = fields.filter((field) => {
          const value = (profile as any)[field];
          return value && value.toString().trim().length > 0;
     });
     return Math.round((completed.length / fields.length) * 100);
};

export const getClientBuildingsForSocialProfile = async (
     clientId?: string
): Promise<{ success: boolean; data?: ClientBuildingOption[]; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const viewer = await getViewer();
     const effectiveClientId = clientId ?? viewer.client?.id ?? viewer.clientMember?.client_id ?? null;

     if (!effectiveClientId) {
          log('getClientBuildingsForSocialProfile error: Client not found', 'error');
          return { success: false, error: 'Client not found' };
     }

     const { data, error } = await supabase
          .from(TABLES.BUILDINGS)
          .select(`
               id,
               building_location:tblBuildingLocations!tblBuildings_building_location_fkey (
                    street_address,
                    city,
                    country
               )
          `)
          .eq('client_id', effectiveClientId)
          .order('created_at', { ascending: false });

     if (error) {
          log(`getClientBuildingsForSocialProfile error for clientId ${effectiveClientId}: ${error.message}`, 'error');
          return { success: false, error: error.message };
     }

     const options: ClientBuildingOption[] = (data ?? []).map((row: any) => {
          const location = row.building_location as any;
          const labelPieces = [location?.street_address, location?.city].filter(Boolean);
          const label = labelPieces.length ? labelPieces.join(', ') : 'Building';
          return {
               id: row.id,
               label,
               street_address: location?.street_address,
               city: location?.city,
          };
     });

     return { success: true, data: options };
};

export const createClientSocialProfile = async (buildingId: string): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const viewer = await getViewer();
     const client = viewer.client ?? null;
     const clientId = client?.id ?? viewer.clientMember?.client_id ?? null;

     if (!clientId) {
          log('createClientSocialProfile error: Client not found', 'error');
          return { success: false, error: 'Client not found' };
     }

     if (!buildingId || !isUUID(buildingId)) {
          log('createClientSocialProfile error: Invalid building selected', 'error');
          return { success: false, error: 'Invalid building selected' };
     }

     // Ensure the selected building belongs to this client
     const { data: buildingRow, error: buildingError } = await supabase
          .from(TABLES.BUILDINGS)
          .select(`
               id,
               client_id,
               building_location:tblBuildingLocations!tblBuildings_building_location_fkey (city)
          `)
          .eq('id', buildingId)
          .single();

     if (buildingError || !buildingRow) {
          log(`createClientSocialProfile error: ${buildingError?.message ?? 'Building not found'}`, 'error');
          return { success: false, error: buildingError?.message ?? 'Building not found' };
     }

     if (buildingRow.client_id !== clientId) {
          log('createClientSocialProfile error: Building does not belong to this client', 'error');
          return { success: false, error: 'Building does not belong to this client' };
     }

     const { data: clientRow, error: clientError } = await supabase
          .from(TABLES.CLIENTS)
          .select('id, contact_person, name, email, phone, mobile_phone')
          .eq('id', clientId)
          .single();

     if (clientError || !clientRow) {
          log(`createClientSocialProfile error: ${clientError?.message ?? 'Client not found'}`, 'error');
          return { success: false, error: clientError?.message ?? 'Client not found' };
     }

     const profilePayload = {
          id: clientId,
          tenant_id: clientId,
          client_id: clientId,
          first_name: clientRow.contact_person || clientRow.name || viewer.clientMember?.name || '',
          last_name: '',
          email: clientRow.email || viewer.clientMember?.email || '',
          phone_number: clientRow.phone || clientRow.mobile_phone || '',
          current_city: (buildingRow as any)?.building_location?.city ?? null,
     };

     const profile_progress = calculateClientProfileProgress(profilePayload);
     const nowIso = new Date().toISOString();

     const { error: upsertError } = await supabase
          .from(TABLES.TENANT_PROFILES)
          .upsert(
               {
                    ...profilePayload,
                    profile_progress,
                    updated_at: nowIso,
                    created_at: nowIso,
               },
               { onConflict: 'id' }
          );

     if (upsertError) {
          log(`createClientSocialProfile upsert error: ${upsertError.message}`, 'error');
          return { success: false, error: upsertError.message };
     }

     revalidatePath('/dashboard/social/profile');
     revalidatePath('/dashboard/social');
     return { success: true };
};

// Returns true if the provided userId corresponds to a Client record; false if tenant or not found.
export const isClientUserId = async (userId: string): Promise<boolean> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const { data: client, error: clientError } = await supabase.from(TABLES.CLIENTS).select('id').eq('user_id', userId).single();
     if (clientError) log(`isClientUserId error (client): ${clientError.message}`, 'error');
     if (client && isUUIDv4(client.id) && !clientError) return true;
     const { data: clientMember, error: clientMemberError } = await supabase.from(TABLES.CLIENT_MEMBERS).select('id').eq('user_id', userId).single();
     if (clientMemberError) log(`isClientUserId error (clientMember): ${clientMemberError.message}`, 'error');
     if (clientMember && isUUIDv4(clientMember.id) && !clientMemberError) return true;
     const { data: tenant, error: tenantError } = await supabase.from(TABLES.TENANTS).select('id').eq('user_id', userId).single();
     if (tenantError) log(`isClientUserId error (tenant): ${tenantError.message}`, 'error');
     if (tenant && isUUIDv4(tenant.id) && !tenantError) return false;
     return !!tenant;
}


