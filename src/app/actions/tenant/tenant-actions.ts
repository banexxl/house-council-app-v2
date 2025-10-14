'use server';

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Tenant } from 'src/types/tenant';
import { validate as isUUID } from 'uuid';

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
): Promise<{ success: boolean; data: Record<string, { email?: string | null; phone_number?: string | null; email_opt_in?: boolean | null; sms_opt_in?: boolean | null }>; error?: string }> => {
     try {
          if (!Array.isArray(userIds) || userIds.length === 0) return { success: true, data: {} };
          const supabase = await useServerSideSupabaseAnonClient();
          const { data, error } = await supabase
               .from(TABLES.TENANTS)
               .select('user_id, email, phone_number, email_opt_in, sms_opt_in')
               .in('user_id', userIds);
          if (error) return { success: false, error: error.message, data: {} as any };
          const map: Record<string, { email?: string | null; phone_number?: string | null; email_opt_in?: boolean | null; sms_opt_in?: boolean | null }> = {};
          for (const row of (data || []) as any[]) {
               map[row.user_id] = {
                    email: row.email ?? null,
                    phone_number: row.phone_number ?? null,
                    email_opt_in: row.email_opt_in ?? null,
                    sms_opt_in: row.sms_opt_in ?? null,
               };
          }
          return { success: true, data: map };
     } catch (e: any) {
          return { success: false, error: e?.message || 'Unexpected error', data: {} as any };
     }
}