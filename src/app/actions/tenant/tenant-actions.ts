'use server';

import { revalidatePath } from 'next/cache';
import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Tenant } from 'src/types/tenant';
import { validate as isUUID } from 'uuid';
import log from 'src/utils/logger';
import { TenantContact } from 'src/types/notification';


/**
 * 
 * @param userId 
 * @param newPassword 
 * @returns 
 */
// This function is for password reset via email/token (not admin reset)
export const resetTenantPassword = async (
     email: string,
     newPassword: string,
     token: string
): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();

     // Use verifyOtp to complete the password reset
     const { error } = await supabase.auth.verifyOtp({
          type: 'recovery',
          token: token,
          email: email,
     });

     if (error) return { success: false, error: error.message };

     // Now update the password
     const { error: updateError } = await supabase.auth.updateUser({
          email,
          password: newPassword,
     });
     if (updateError) return { success: false, error: updateError.message };
     return { success: true };
};
/**
 * Get all tenants (admin only)
 */
export const getAllTenants = async () => {
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase
          .from(TABLES.TENANTS)
          .select('*');
     if (error) return { success: false, error: error.message };
     return { success: true, data };
};
// CREATE or UPDATE tenant
export const createOrUpdateTenantAction = async (
     tenant: Tenant
): Promise<{
     saveTenantActionSuccess: boolean;
     saveTenantActionData?: Tenant;
     saveTenantActionError?: any;
}> => {
     const start = Date.now();
     const anonSupabase = await useServerSideSupabaseAnonClient();
     const adminSupabase = await useServerSideSupabaseServiceRoleClient();
     const { id, apartment, ...tenantData } = tenant; // Remove `apartment` if it exists

     if (id && id !== '') {
          // === UPDATE ===
          // 1. Update tenant record
          const { data: updatedTenant, error: updateTenantError } = await anonSupabase
               .from(TABLES.TENANTS)
               .update({
                    ...tenantData,
                    updated_at: new Date().toISOString(),
               })
               .eq('id', id)
               .select()
               .single();

          if (updateTenantError) {
               await logServerAction({
                    user_id: null,
                    action: 'Update Tenant - Failed',
                    duration_ms: Date.now() - start,
                    error: updateTenantError.message,
                    payload: { id, tenantData },
                    status: 'fail',
                    type: 'action',

               });

               return { saveTenantActionSuccess: false, saveTenantActionError: updateTenantError };
          }

          // 2. Update auth user
          const { data: updatedUser, error: updateUserError } = await adminSupabase.auth.admin.updateUserById(tenant.user_id!, {
               email: tenantData.email!,
               email_confirm: true,
               phone: tenantData.phone_number,
          });

          if (updateUserError) {
               await logServerAction({
                    user_id: null,
                    action: 'Update Tenant Auth User - Failed',
                    duration_ms: Date.now() - start,
                    error: updateUserError.message,
                    payload: { email: tenantData.email },
                    status: 'fail',
                    type: 'auth',

               });

               return {
                    saveTenantActionSuccess: false,
                    saveTenantActionError: updateUserError?.message ?? 'Failed to update auth user for tenant',
               };
          }

          await logServerAction({
               user_id: null,
               action: 'Update Tenant - Success',
               duration_ms: Date.now() - start,
               error: '',
               payload: { tenantData },
               status: 'success',
               type: 'action',

          });

          revalidatePath(`/dashboard/tenants/${id}`);
          return {
               saveTenantActionSuccess: true,
               saveTenantActionData: updatedTenant as Tenant,
          };
     } else {
          // === CREATE ===
          // 1. Create auth user
          // We need to use adminSupabase here to add the user to the auth.users table
          // This is because anonSupabase does not have permissions to create users
          const { data: createdUser, error: userError } = await adminSupabase.auth.admin.createUser({
               email: tenantData.email!,
               email_confirm: true,
               phone: tenantData.phone_number,
          });

          if (userError || !createdUser?.user) {
               await logServerAction({
                    user_id: null,
                    action: 'Create Tenant Auth User - Failed',
                    duration_ms: Date.now() - start,
                    error: userError?.message ?? 'Unknown error',
                    payload: { email: tenantData.email },
                    status: 'fail',
                    type: 'auth',
               });

               return {
                    saveTenantActionSuccess: false,
                    saveTenantActionError:
                         (
                              (() => {
                                   const errorMap: Record<string | number, string> = {
                                        'email_exists': 'tenants.tenantAlreadyExists',
                                        'validation_failed': 'tenants.invalidEmailOrPhoneNumber',
                                        'phone_exists': 'tenants.phoneAlreadyExists',
                                   };
                                   const code = userError?.code ?? userError?.status;
                                   if (typeof code === 'string' || typeof code === 'number') {
                                        return errorMap[code] || 'tenants.failedToCreateAuthUser';
                                   }
                                   return 'tenants.failedToCreateAuthUser';
                              })()
                         ),
               };
          }

          // 2. Create tenant record
          const { data: insertedTenant, error: insertError } = await anonSupabase
               .from(TABLES.TENANTS)
               .insert({
                    ...tenantData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    move_in_date: tenantData.move_in_date || null,
                    date_of_birth: tenantData.date_of_birth || null,
                    user_id: createdUser.user.id,
               })
               .select()
               .single();

          if (insertError || !insertedTenant) {
               await logServerAction({
                    action: 'Create Tenant - Failed',
                    duration_ms: Date.now() - start,
                    error: insertError?.message ?? 'Unknown error',
                    payload: { tenantData },
                    status: 'fail',
                    type: 'action',
                    user_id: createdUser.user.id,
               });

               // Deleting the user if tenant creation fails

               const { error: deleteUserError } = await anonSupabase.auth.admin.deleteUser(createdUser.user.id);
               if (deleteUserError) {
                    await logServerAction({
                         action: 'Delete Tenant Auth User - Failed',
                         duration_ms: Date.now() - start,
                         error: deleteUserError.message,
                         payload: { userId: createdUser.user.id },
                         status: 'fail',
                         type: 'auth',
                         user_id: createdUser.user.id,
                    })
               }
               return { saveTenantActionSuccess: false, saveTenantActionError: insertError };
          }

          await logServerAction({
               action: 'Create Tenant - Success',
               duration_ms: Date.now() - start,
               error: '',
               payload: { tenantData },
               status: 'success',
               type: 'action',
               user_id: createdUser.user.id,
          });

          // If all goes well, send the invite email
          const { data: invitedUser, error: inviteError } = await adminSupabase.auth.resetPasswordForEmail(tenantData.email!, {
               redirectTo: process.env.NEXT_PUBLIC_SUPABASE_PASSWORD_RECOVERY_REDIRECT_URL,
          });

          revalidatePath(`/dashboard/tenants/${insertedTenant.id}`);
          return {
               saveTenantActionSuccess: true,
               saveTenantActionData: insertedTenant as Tenant,
          };
     }
};

// READ tenant by ID
export const readTenantByIdAction = async (
     tenantId: string
): Promise<{
     getTenantByIdActionSuccess: boolean;
     getTenantByIdActionData?: Tenant;
     getTenantByIdActionError?: string;
}> => {
     const supabase = await useServerSideSupabaseAnonClient();
     if (!isUUID(tenantId)) return { getTenantByIdActionSuccess: false, getTenantByIdActionError: 'Invalid tenant ID' };

     const { data, error } = await supabase.from(TABLES.TENANTS).select('*').eq('id', tenantId).single();
     if (error) {
          return {
               getTenantByIdActionSuccess: false,
               getTenantByIdActionError: error.message,
          };
     }

     return {
          getTenantByIdActionSuccess: true,
          getTenantByIdActionData: data as Tenant,
     };
};

// DELETE tenant by ID (and delete linked auth.users)
export const deleteTenantByIDAction = async (
     id: string
): Promise<{ deleteTenantByIDActionSuccess: boolean; deleteTenantByIDActionError?: string }> => {

     const adminSupabase = await useServerSideSupabaseServiceRoleClient();
     const anonSupabase = await useServerSideSupabaseAnonClient();

     try {
          const { data: tenantToDelete, error: fetchError } = await anonSupabase
               .from(TABLES.TENANTS)
               .select('user_id')
               .eq('id', id)
               .single();

          if (fetchError) {
               return { deleteTenantByIDActionSuccess: false, deleteTenantByIDActionError: fetchError.message };
          }

          const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(tenantToDelete.user_id);
          if (deleteUserError) {
               return { deleteTenantByIDActionSuccess: false, deleteTenantByIDActionError: deleteUserError.message };
          }

          const { error: deleteTenantError } = await anonSupabase.from(TABLES.TENANTS).delete().eq('id', id);
          if (deleteTenantError) {
               return { deleteTenantByIDActionSuccess: false, deleteTenantByIDActionError: deleteTenantError.message };
          }

          revalidatePath('/dashboard/tenants');

          return { deleteTenantByIDActionSuccess: true };
     } catch (error: any) {
          return {
               deleteTenantByIDActionSuccess: false,
               deleteTenantByIDActionError: error.message,
          };
     }
};

// GET all tenants from client's buildings
export const getAllTenantsFromClientsBuildings = async (
     clientId: string
): Promise<{
     success: boolean; data?: Tenant[] & {
          apartment?: {
               apartment_number?: string;
               building?: {
                    street_address?: string;
                    city?: string;
               };
          }
     }; error?: string
}> => {
     const start = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     // 1. Get buildings owned by the client
     const { data: buildings, error: buildingsError } = await supabase
          .from(TABLES.BUILDINGS)
          .select('id')
          .eq('client_id', clientId);

     if (buildingsError) {
          return { success: false, error: buildingsError.message };
     }

     const buildingIds = buildings.map((b) => b.id);
     if (buildingIds.length === 0) {
          return { success: true, data: [] };
     }

     // 2. Get apartments in those buildings
     const { data: apartments, error: apartmentsError } = await supabase
          .from(TABLES.APARTMENTS)
          .select('id')
          .in('building_id', buildingIds);

     if (apartmentsError) {
          return { success: false, error: apartmentsError.message };
     }

     const apartmentIds = apartments.map((a) => a.id);
     if (apartmentIds.length === 0) {
          return { success: true, data: [] };
     }

     // ✅ 3. Get tenants with nested apartment → building → building_location
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

     if (tenantsError) {
          await logServerAction({
               action: 'getAllTenantsFromClientsBuildings',
               duration_ms: Date.now() - start,
               error: tenantsError.message,
               payload: { clientId },
               status: 'fail',
               type: 'db',
               user_id: clientId,

          });
          return { success: false, error: tenantsError.message };
     }

     return { success: true, data: tenants ?? [] };
};

/**
 * Get all tenants from client's buildings with their last sign-in data
 */
export const getAllTenantsFromClientsBuildingsWithAuthData = async (
     clientId: string
): Promise<{
     success: boolean;
     data?: (Tenant & { last_sign_in_at?: string })[];
     error?: string
}> => {
     const anonSupabase = await useServerSideSupabaseAnonClient();
     const adminSupabase = await useServerSideSupabaseServiceRoleClient();

     try {
          // 1. Get buildings owned by the client
          const { data: buildings, error: buildingsError } = await anonSupabase
               .from(TABLES.BUILDINGS)
               .select('id')
               .eq('client_id', clientId);

          if (buildingsError) {
               return { success: false, error: buildingsError.message };
          }

          const buildingIds = buildings.map((b) => b.id);
          if (buildingIds.length === 0) {
               return { success: true, data: [] };
          }

          // 2. Get apartments in those buildings
          const { data: apartments, error: apartmentsError } = await anonSupabase
               .from(TABLES.APARTMENTS)
               .select('id')
               .in('building_id', buildingIds);

          if (apartmentsError) {
               return { success: false, error: apartmentsError.message };
          }

          const apartmentIds = apartments.map((a) => a.id);
          if (apartmentIds.length === 0) {
               return { success: true, data: [] };
          }

          // 3. Get tenants with nested apartment → building → building_location
          const { data: tenants, error: tenantsError } = await anonSupabase
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

          if (tenantsError) {
               return { success: false, error: tenantsError.message };
          }

          if (!tenants || tenants.length === 0) {
               return { success: true, data: [] };
          }

          // 4. Get auth data for all tenants using service role client
          const userIds = tenants.map(tenant => tenant.user_id).filter(Boolean);

          if (userIds.length === 0) {
               return { success: true, data: tenants };
          }

          const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers();

          if (authError) {
               log(`Failed to fetch auth users: ${authError.message}`);
               // Return tenants without auth data if auth fetch fails
               return { success: true, data: tenants };
          }

          // 5. Merge tenant data with auth data
          const tenantsWithAuthData = tenants.map(tenant => {
               const authUser = authUsers.users.find(user => user.id === tenant.user_id);
               return {
                    ...tenant,
                    last_sign_in_at: authUser?.last_sign_in_at || null
               };
          });

          return { success: true, data: tenantsWithAuthData };
     } catch (e: any) {
          log(`Error in getAllTenantsFromClientsBuildingsWithAuthData: ${e?.message}`);
          return { success: false, error: e?.message || 'Unexpected error' };
     }
};

// GET all buildings with apartments for a client
export const getAllBuildingsWithApartmentsForClient = async (
     clientId: string
): Promise<{
     success: boolean;
     data?: {
          id: string;
          name: string; // composed from location
          apartments: {
               id: string;
               apartment_number: string;
          }[];
     }[];
     error?: string;
}> => {
     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase
          .from(TABLES.BUILDINGS)
          .select(`
    id,
    building_location:tblBuildingLocations!tblBuildings_building_location_fkey (
      street_address,
      street_number,
      city
    ),
    apartments:tblApartments (
      id,
      apartment_number
    )
  `)
          .eq('client_id', clientId);

     if (error) {
          return { success: false, error: error.message };
     }

     // Compose a name from building location fields
     const buildings = (data ?? []).map((building: any) => ({
          id: building.id,
          name: `${building.building_location?.street_number ?? ''} ${building.building_location?.street_address ?? ''}, ${building.building_location?.city ?? ''}`.trim(),
          apartments: building.apartments ?? [],
     }));

     return {
          success: true,
          data: buildings,
     };
};

export const readAllTenantsFromBuildingIds = async (
     buildingIds: string[]
): Promise<{ success: boolean; data?: Tenant[]; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const { data: buildings, error } = await supabase
          .from(TABLES.BUILDINGS)
          .select('id')
          .in('id', buildingIds);
     if (error) {
          return { success: false, error: error.message };
     }
     const validBuildingIds = buildings.map((b) => b.id);
     if (validBuildingIds.length === 0) {
          return { success: true, data: [] };
     }
     // 2. Get apartments in those buildings
     const { data: apartments, error: apartmentsError } = await supabase
          .from(TABLES.APARTMENTS)
          .select('id')
          .in('building_id', validBuildingIds);
     if (apartmentsError) {
          return { success: false, error: apartmentsError.message };
     }
     const apartmentIds = apartments.map((a) => a.id);
     if (apartmentIds.length === 0) {
          return { success: true, data: [] };
     }
     // 3. Get tenants in those apartments
     const { data: tenants, error: tenantsError } = await supabase
          .from(TABLES.TENANTS)
          .select('*')
          .in('apartment_id', apartmentIds);

     if (tenantsError) {
          return { success: false, error: tenantsError.message };
     }
     return { success: true, data: tenants ? tenants : [] };
};

// Lightweight contact lookup for notifications fanout
export const readTenantContactByUserIds = async (
     userIds: string[]
): Promise<{ success: boolean; data: TenantContact[]; error?: string }> => {
     userIds.forEach((id) => log(`these should all be tenant user_ids ${id}`));
     try {
          if (!Array.isArray(userIds) || userIds.length === 0) return { success: true, data: [] };
          const supabase = await useServerSideSupabaseAnonClient();
          const { data, error } = await supabase
               .from(TABLES.TENANTS)
               .select('user_id, email, phone_number, email_opt_in, sms_opt_in')
               .in('user_id', userIds);
          if (error) return { success: false, error: error.message, data: {} as any };
          const map: Record<string, TenantContact> = {};
          for (const row of (data || []) as TenantContact[]) {
               map[row.email!] = {
                    user_id: row.user_id!,
                    email: row.email ?? null,
                    phone_number: row.phone_number ?? null,
                    email_opt_in: row.email_opt_in ?? null,
                    sms_opt_in: row.sms_opt_in ?? null,
               };
          }
          return { success: true, data: Object.values(map) };
     } catch (e: any) {
          return { success: false, error: e?.message || 'Unexpected error', data: [] };
     }
}

/**
 * Get all tenants from the same building as the specified tenant with their last sign-in data
 */
export const getTenantsFromSameBuildingWithAuthData = async (
     tenantId: string
): Promise<{
     success: boolean;
     data?: (Tenant & { last_sign_in_at?: string })[];
     error?: string
}> => {
     const anonSupabase = await useServerSideSupabaseAnonClient();
     const adminSupabase = await useServerSideSupabaseServiceRoleClient();

     try {
          // 1. Get the current tenant's apartment and building info
          const { data: currentTenant, error: tenantError } = await anonSupabase
               .from(TABLES.TENANTS)
               .select(`
                    apartment_id,
                    apartment:tblApartments (
                         building_id
                    )
               `)
               .eq('id', tenantId)
               .single();

          if (tenantError || !(currentTenant?.apartment as any)?.building_id) {
               log(`Failed to fetch current tenant's building info: ${tenantError?.message || 'Unknown error'}`);
               return { success: false, error: tenantError?.message || 'Tenant not found' };
          }

          const buildingId = (currentTenant.apartment as any).building_id;

          // 2. Get all apartments in the same building
          const { data: apartments, error: apartmentsError } = await anonSupabase
               .from(TABLES.APARTMENTS)
               .select('id')
               .eq('building_id', buildingId);
          if (apartmentsError) {
               return { success: false, error: apartmentsError.message };
          }

          const apartmentIds = apartments.map((a) => a.id);
          if (apartmentIds.length === 0) {
               return { success: true, data: [] };
          }

          // 3. Get all tenants in those apartments
          const { data: tenants, error: tenantsError } = await anonSupabase
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
               .in('apartment_id', apartmentIds)
               .neq('id', tenantId); // Exclude the current tenant

          if (tenantsError) {
               return { success: false, error: tenantsError.message };
          }

          if (!tenants || tenants.length === 0) {
               return { success: true, data: [] };
          }

          // 4. Get auth data for all tenants using service role client
          const userIds = tenants.map(tenant => tenant.user_id).filter(Boolean);

          if (userIds.length === 0) {
               return { success: true, data: tenants };
          }

          const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers();

          if (authError) {
               log(`Failed to fetch auth users: ${authError.message}`);
               // Return tenants without auth data if auth fetch fails
               return { success: true, data: tenants };
          }

          // 5. Merge tenant data with auth data
          const tenantsWithAuthData = tenants.map(tenant => {
               const authUser = authUsers.users.find(user => user.id === tenant.user_id);
               return {
                    ...tenant,
                    last_sign_in_at: authUser?.last_sign_in_at || null
               };
          });

          return { success: true, data: tenantsWithAuthData };
     } catch (e: any) {
          log(`Error in getTenantsFromSameBuildingWithAuthData: ${e?.message}`);
          return { success: false, error: e?.message || 'Unexpected error' };
     }
};

/**
 * Get all tenants from the same building as the specified tenant
 */
export const getTenantsFromSameBuilding = async (
     tenantId: string
): Promise<{
     success: boolean;
     data?: Tenant[];
     error?: string
}> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          // 1. Get the current tenant's apartment and building info
          const { data: currentTenant, error: tenantError } = await supabase
               .from(TABLES.TENANTS)
               .select(`
                    apartment_id,
                    apartment:tblApartments (
                         building_id
                    )
               `)
               .eq('id', tenantId)
               .single();

          if (tenantError || !(currentTenant?.apartment as any)?.building_id) {
               log(`Failed to fetch current tenant's building info: ${tenantError?.message || 'Unknown error'}`);
               return { success: false, error: tenantError?.message || 'Tenant not found' };
          }

          const buildingId = (currentTenant.apartment as any).building_id;          // 2. Get all apartments in the same building
          const { data: apartments, error: apartmentsError } = await supabase
               .from(TABLES.APARTMENTS)
               .select('id')
               .eq('building_id', buildingId);
          if (apartmentsError) {
               return { success: false, error: apartmentsError.message };
          }

          const apartmentIds = apartments.map((a) => a.id);
          if (apartmentIds.length === 0) {
               return { success: true, data: [] };
          }

          // 3. Get all tenants in those apartments
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
               .in('apartment_id', apartmentIds)
               .neq('id', tenantId); // Exclude the current tenant
          if (tenantsError) {
               return { success: false, error: tenantsError.message };
          }

          return { success: true, data: tenants || [] };
     } catch (e: any) {
          return { success: false, error: e?.message || 'Unexpected error' };
     }
}

/**
 * Get all users from the same building as the current user
 */
export const getBuildingTenants = async (): Promise<{
     success: boolean;
     data?: Tenant[];
     error?: string;
}> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
               return { success: false, error: 'User not authenticated' };
          }

          // Determine current user type and get their building IDs
          let buildingIds: string[] = [];

          // Check if user is a tenant
          const { data: tenantData } = await supabase
               .from(TABLES.TENANTS)
               .select(`
        apartment_id,
        ${TABLES.APARTMENTS}!inner(building_id)
      `)
               .eq('user_id', user.id);

          if (tenantData && tenantData.length > 0) {
               // User is a tenant - get building IDs from their apartments
               buildingIds = tenantData
                    .map((t: any) => t[TABLES.APARTMENTS]?.building_id)
                    .filter(Boolean);
          } else {
               // Check if user is a client
               const { data: clientData } = await supabase
                    .from(TABLES.CLIENTS)
                    .select('id')
                    .eq('user_id', user.id);

               if (clientData && clientData.length > 0) {
                    // User is a client - get their buildings
                    const { data: buildings } = await supabase
                         .from(TABLES.BUILDINGS)
                         .select('id')
                         .eq('client_id', clientData[0].id);

                    buildingIds = buildings?.map(b => b.id) || [];
               }
          }

          if (buildingIds.length === 0) {
               return { success: true, data: [] };
          }

          return await getUsersFromBuildings(buildingIds);
     } catch (error: any) {
          log(`Error in getBuildingTenants: ${error.message}`);
          return { success: false, error: error.message };
     }
};

/**
 * Get users from specific buildings
 */
export const getUsersFromBuildings = async (buildingIds: string[]): Promise<{
     success: boolean;
     data?: Tenant[];
     error?: string;
}> => {
     const serviceSupabase = await useServerSideSupabaseServiceRoleClient();

     try {
          const users: Tenant[] = [];

          // Get tenants from these buildings
          const { data: apartments } = await serviceSupabase
               .from(TABLES.APARTMENTS)
               .select('id')
               .in('building_id', buildingIds);

          if (apartments && apartments.length > 0) {
               const apartmentIds = apartments.map(a => a.id);
               const { data: tenants } = await serviceSupabase
                    .from(TABLES.TENANTS)
                    .select(`
          id,
          user_id,
          email,
          first_name,
          last_name,
          apartments!inner(apartment_number)
        `)
                    .in('apartment_id', apartmentIds);

               if (tenants) {
                    users.push(...tenants.map((tenant: any) => ({
                         id: tenant.user_id || '',
                         first_name: tenant.first_name || '',
                         last_name: tenant.last_name || '',
                         email: tenant.email,
                         phone_number: '',
                         date_of_birth: '',
                         apartment_id: tenant.apartment_id || '',
                         apartment: {
                              apartment_number: tenant.apartments?.apartment_number || '',
                              building: {
                                   street_address: '',
                                   city: ''
                              }
                         },
                         avatar_url: '',
                         is_primary: false,
                         move_in_date: '',
                         tenant_type: 'owner' as const,
                         notes: '',
                         created_at: '',
                         updated_at: '',
                         user_id: tenant.user_id,
                         email_opt_in: false,
                         sms_opt_in: false,
                         viber_opt_in: false,
                         whatsapp_opt_in: false,
                         // Chat-related properties
                         last_activity: '',
                         is_online: false,
                         role: 'member' as const,
                         joined_at: '',
                         last_read_at: '',
                         is_muted: false
                    } as Tenant)));
               }
          }

          // Get clients who own these buildings
          const { data: clientsFromBuildings } = await serviceSupabase
               .from(TABLES.BUILDINGS)
               .select(`
        client_id,
        ${TABLES.CLIENTS}!inner(
          id,
          user_id,
          email,
          first_name,
          last_name,
          company_name
        )
      `)
               .in('id', buildingIds);

          if (clientsFromBuildings) {
               const uniqueClients = new Map();
               clientsFromBuildings.forEach((building: any) => {
                    const client = building[TABLES.CLIENTS];
                    if (client) {
                         uniqueClients.set(client.user_id, {
                              id: client.user_id || '',
                              first_name: client.first_name || '',
                              last_name: client.last_name || '',
                              email: client.email,
                              phone_number: '',
                              date_of_birth: '',
                              apartment_id: '',
                              apartment: {
                                   apartment_number: '',
                                   building: {
                                        street_address: '',
                                        city: ''
                                   }
                              },
                              avatar_url: '',
                              is_primary: false,
                              move_in_date: '',
                              tenant_type: 'other' as const,
                              notes: '',
                              created_at: '',
                              updated_at: '',
                              user_id: client.user_id,
                              email_opt_in: false,
                              sms_opt_in: false,
                              viber_opt_in: false,
                              whatsapp_opt_in: false,
                              // Chat-related properties
                              last_activity: '',
                              is_online: false,
                              role: 'member' as const,
                              joined_at: '',
                              last_read_at: '',
                              is_muted: false
                         } as Tenant);
                    }
               });
               users.push(...Array.from(uniqueClients.values()));
          }

          return { success: true, data: users };
     } catch (error: any) {
          log(`Error in getUsersFromBuildings: ${error.message}`);
          return { success: false, error: error.message };
     }
};

/**
 * Get users from a specific building
 */
export const getUsersFromBuilding = async (buildingId: string): Promise<{
     success: boolean;
     data?: Tenant[];
     error?: string;
}> => {
     return await getUsersFromBuildings([buildingId]);
};

/**
 * Search for users in buildings with a query
 */
export const searchBuildingTenants = async (query: string): Promise<{
     success: boolean;
     data?: Tenant[];
     error?: string;
}> => {
     try {
          // Get current user to exclude from results
          const supabase = await useServerSideSupabaseAnonClient();
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
               return { success: false, error: 'Failed to get current user' };
          }

          // Get all building users first
          const result = await getBuildingTenants();
          if (!result.success || !result.data) {
               return result;
          }

          // Filter users based on query and exclude current user
          const searchTerm = query.toLowerCase();
          const filteredUsers = result.data.filter(buildingTenant => {
               // Exclude current logged-in user
               if (buildingTenant.id === user.id) {
                    return false;
               }

               const fullName = `${buildingTenant.first_name} ${buildingTenant.last_name}`.toLowerCase();
               const email = buildingTenant.email && buildingTenant.email.toLowerCase() || '';
               const apartmentNumber = buildingTenant.apartment.apartment_number && buildingTenant.apartment.apartment_number.toLowerCase() || '';

               return (
                    fullName.includes(searchTerm) ||
                    email.includes(searchTerm) ||
                    apartmentNumber.includes(searchTerm)
               );
          });

          return { success: true, data: filteredUsers };
     } catch (error: any) {
          log(`Error in searchBuildingTenants: ${error.message}`);
          return { success: false, error: error.message };
     }
};

export const updateTenantActivityStatus = async (tenant_id: string, is_online: boolean, last_activity: Date): Promise<{
     success: boolean;
     error?: string;
}> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { error } = await supabase
               .from(TABLES.TENANTS)
               .update({ is_online, last_activity })
               .eq('id', tenant_id);
          if (error) {
               return { success: false, error: error.message };
          }
          return { success: true };
     } catch (error) {
          return { success: false, error: (error as any).message || 'Unexpected error' };
     }
}


