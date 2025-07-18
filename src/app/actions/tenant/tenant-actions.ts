'use server';

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Tenant } from 'src/types/tenant';
import { validate as isUUID } from 'uuid';

// CREATE or UPDATE tenant
export const createOrUpdateTenantAction = async (
     tenant: Tenant
): Promise<{
     saveTenantActionSuccess: boolean;
     saveTenantActionData?: Tenant;
     saveTenantActionError?: any;
}> => {
     const anonSupabase = await useServerSideSupabaseAnonClient();
     const adminSupabase = await useServerSideSupabaseServiceRoleClient();
     const { id, ...tenantData } = tenant;

     if (id && id !== '') {
          // === UPDATE ===
          const { data, error: updateError } = await anonSupabase
               .from('tblTenants')
               .update({ ...tenantData, updated_at: new Date().toISOString() })
               .eq('id', id)
               .select()
               .single();

          if (updateError) {
               await logServerAction({
                    action: 'Update Tenant - Failed',
                    duration_ms: 0,
                    error: updateError.message,
                    payload: { id, tenantData },
                    status: 'fail',
                    type: 'action',
                    user_id: '',
               });
               return { saveTenantActionSuccess: false, saveTenantActionError: updateError };
          }

          await logServerAction({
               action: 'Update Tenant - Success',
               duration_ms: 0,
               error: '',
               payload: { id, tenantData },
               status: 'success',
               type: 'action',
               user_id: '',
          });

          revalidatePath(`/dashboard/tenants/${id}`);
          return {
               saveTenantActionSuccess: true,
               saveTenantActionData: data as Tenant,
          };
     } else {
          // === CREATE ===
          const { data: invitedUser, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(tenantData.email!, {
               redirectTo: process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL!,
          });

          if (inviteError || !invitedUser?.user) {
               await logServerAction({
                    action: 'Invite Tenant Auth User - Failed',
                    duration_ms: 0,
                    error: inviteError?.message ?? 'Unknown error',
                    payload: { email: tenantData.email },
                    status: 'fail',
                    type: 'auth',
                    user_id: '',
               });

               return {
                    saveTenantActionSuccess: false,
                    saveTenantActionError: inviteError?.message ?? 'Failed to invite tenant auth user',
               };
          }

          const { data, error: insertError } = await anonSupabase
               .from('tblTenants')
               .insert({
                    ...tenantData,
                    user_id: invitedUser.user.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
               })
               .select()
               .single();

          if (insertError) {
               await logServerAction({
                    action: 'Create Tenant - Failed',
                    duration_ms: 0,
                    error: insertError.message,
                    payload: { tenantData },
                    status: 'fail',
                    type: 'action',
                    user_id: invitedUser.user.id,
               });
               return { saveTenantActionSuccess: false, saveTenantActionError: insertError };
          }

          await logServerAction({
               action: 'Create Tenant - Success',
               duration_ms: 0,
               error: '',
               payload: { tenantData },
               status: 'success',
               type: 'action',
               user_id: invitedUser.user.id,
          });

          revalidatePath(`/dashboard/tenants/${data.id}`);
          return {
               saveTenantActionSuccess: true,
               saveTenantActionData: data as Tenant,
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

     const { data, error } = await supabase.from('tblTenants').select('*').eq('id', tenantId).single();
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

// DELETE tenants by IDs (and delete linked auth.users)
export const deleteTenantByIDsAction = async (
     ids: string[]
): Promise<{ deleteTenantByIDsActionSuccess: boolean; deleteTenantByIDsActionError?: string }> => {
     const anonSupabase = await useServerSideSupabaseAnonClient();
     const adminSupabase = await useServerSideSupabaseServiceRoleClient();

     try {
          const { data: tenantsToDelete, error: fetchError } = await anonSupabase
               .from('tblTenants')
               .select('user_id')
               .in('id', ids);

          if (fetchError) throw fetchError;

          const userIdsToDelete = tenantsToDelete.map((t) => t.user_id).filter(Boolean);

          const { error: deleteTenantError } = await anonSupabase.from('tblTenants').delete().in('id', ids);
          if (deleteTenantError) throw deleteTenantError;

          const failedDeletes: string[] = [];

          for (const userId of userIdsToDelete) {
               const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(userId);
               if (deleteUserError) failedDeletes.push(userId);
          }

          revalidatePath('/dashboard/tenants');

          if (failedDeletes.length > 0) {
               return {
                    deleteTenantByIDsActionSuccess: false,
                    deleteTenantByIDsActionError: `Failed to delete auth.users for: ${failedDeletes.join(', ')}`,
               };
          }

          return { deleteTenantByIDsActionSuccess: true };
     } catch (error: any) {
          return {
               deleteTenantByIDsActionSuccess: false,
               deleteTenantByIDsActionError: error.message,
          };
     }
};

// READ tenants for a client’s buildings
export const getAllTenantsFromClientsBuildings = async (
     clientId: string
): Promise<{ success: boolean; data?: Tenant[]; error?: string }> => {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { data: buildings, error: buildingsError } = await supabase
          .from('tblBuildings')
          .select('id')
          .eq('client_id', clientId);

     if (buildingsError) {
          return { success: false, error: buildingsError.message };
     }

     const buildingIds = buildings.map((b) => b.id);

     const { data: apartments, error: apartmentsError } = await supabase
          .from('tblApartments')
          .select('id')
          .in('building_id', buildingIds);

     if (apartmentsError) {
          return { success: false, error: apartmentsError.message };
     }

     const apartmentIds = apartments.map((a) => a.id);

     const { data: tenants, error: tenantsError } = await supabase
          .from('tblTenants')
          .select('*')
          .in('apartment_id', apartmentIds);

     if (tenantsError) {
          await logServerAction({
               action: 'getAllTenantsFromClientsBuildings',
               duration_ms: Date.now() - time,
               error: tenantsError.message,
               payload: { clientId },
               status: 'fail',
               type: 'db',
               user_id: clientId,
               id: '',
          });
          return { success: false, error: tenantsError.message };
     }

     return { success: true, data: tenants ?? [] };
};
