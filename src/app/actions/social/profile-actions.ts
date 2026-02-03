'use server';

import { revalidatePath } from 'next/cache';
import { TABLES } from 'src/libs/supabase/tables';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { getViewer } from 'src/libs/supabase/server-auth';
import type {
     TenantProfile,
     CreateTenantProfilePayload,
     UpdateTenantProfilePayload
} from 'src/types/social';
import log from 'src/utils/logger';

type ActionResponse<T> = {
     success: boolean;
     data?: T;
     error?: string;
};

/**
 * Calculate profile completion percentage
 */
function calculateProfileProgress(profile: Partial<TenantProfile>): number {
     const fields = [
          'first_name',
          'last_name',
          'phone_number',
          'bio',
          'avatar_url',
          'current_city',
          'current_job_title',
          'current_job_company',
          'origin_city'
     ];

     const completedFields = fields.filter(field => {
          const value = profile[field as keyof TenantProfile];
          return value && value.toString().trim().length > 0;
     });

     return Math.round((completedFields.length / fields.length) * 100);
}/**
 * Get tenant profile by ID
 */
export async function getTenantProfile(profileId: string): Promise<ActionResponse<TenantProfile>> {
     try {
          const supabase = await useServerSideSupabaseAnonClient();

          const { data, error } = await supabase
               .from(TABLES.TENANT_PROFILES)
               .select('*')
               .eq('id', profileId)
               .single();

          if (error) {
               log(`Error fetching tenant profile: ${error.message}`, 'error');
               return { success: false, error: error.message };
          }

          if (!data) {
               return { success: false, error: 'Profile not found' };
          }

          return { success: true, data };
     } catch (error) {
          log(`Error fetching tenant profile: ${error instanceof Error ? error.message : String(error)}`, 'error');
          return { success: false, error: 'Failed to fetch profile' };
     }
}

/**
 * Get current user's tenant profile
 */
export async function getCurrentUserProfile(): Promise<ActionResponse<TenantProfile>> {
     try {
          const viewer = await getViewer();
          const lookupIds: string[] = [];

          if (viewer.tenant?.id) lookupIds.push(viewer.tenant.id);
          if (viewer.customer?.id) lookupIds.push(viewer.customer.id);
          if (viewer.admin?.id) lookupIds.push(viewer.admin.id);
          if (viewer.userData?.id) lookupIds.push(viewer.userData.id);

          if (!lookupIds.length) {
               log('User not authenticated', 'error');
               return { success: false, error: 'User not authenticated' };
          }

          const supabase = await useServerSideSupabaseAnonClient();
          const filters = lookupIds
               .map((id) => [`id.eq.${id}`, `tenant_id.eq.${id}`])
               .flat()
               .join(',');

          const { data, error } = await supabase
               .from(TABLES.TENANT_PROFILES)
               .select('*')
               .or(filters)
               .limit(1)
               .maybeSingle();

          if (error && error.code !== 'PGRST116') {
               log(`Error fetching current user profile: ${error.message}`, 'error');
               return { success: false, error: error.message };
          }

          if (!data) {
               return { success: false, error: 'Profile not found' };
          }

          return { success: true, data };
     } catch (error) {
          log(`Error fetching current user profile: ${error instanceof Error ? error.message : String(error)}`, 'error');
          return { success: false, error: 'Failed to fetch profile' };
     }
}

/**
 * Get tenant profile by tenant ID
 */
export async function getTenantProfileByTenantId(tenantId: string): Promise<ActionResponse<TenantProfile>> {
     try {
          const supabase = await useServerSideSupabaseAnonClient();

          // First fetch the tenant to get the profile_id reference
          const { data: tenantRow, error: tenantError } = await supabase
               .from(TABLES.TENANTS)
               .select('profile_id')
               .eq('id', tenantId)
               .maybeSingle();

          if (tenantError) {
               log(`Error fetching tenant for profile lookup: ${tenantError.message}`, 'error');
               return { success: false, error: tenantError.message };
          }

          // If tenant row not found
          if (!tenantRow) {
               return { success: false, error: 'Tenant not found' };
          }

          // Prefer explicit profile_id; fall back to tenant_id if missing for backward compatibility
          const profileId = (tenantRow as any).profile_id as string | null | undefined;

          const profileQuery = supabase
               .from(TABLES.TENANT_PROFILES)
               .select('*')
               .limit(1);

          const { data, error } = profileId
               ? await profileQuery.eq('id', profileId).maybeSingle()
               : await profileQuery.eq('tenant_id', tenantId).maybeSingle();

          if (error) {
               log(`Error fetching tenant profile by tenant_id: ${error.message}`, 'error');
               return { success: false, error: error.message };
          }

          if (!data) {
               return { success: false, error: 'Profile not found' };
          }

          return { success: true, data };
     } catch (error) {
          log(`Error fetching tenant profile by tenant_id: ${error instanceof Error ? error.message : String(error)}`, 'error');
          return { success: false, error: 'Failed to fetch profile' };
     }
}

/**
 * Get all tenant profiles (for building connections)
 */
export async function getTenantProfiles(buildingId?: string): Promise<ActionResponse<TenantProfile[]>> {
     try {
          const supabase = await useServerSideSupabaseAnonClient();

          let query = supabase
               .from(TABLES.TENANT_PROFILES)
               .select(`
                *,
                tenant:tenant_id (
                    id,
                    first_name,
                    last_name,
                    apartment:apartment_id (
                        apartment_number,
                        building_id
                    )
                )
            `)

          // If building ID provided, filter by building
          if (buildingId) {
               query = query.eq('tenant.apartment.building_id', buildingId);
          }

          const { data, error } = await query.order('created_at', { ascending: false });

          if (error) {
               log(`Error fetching tenant profiles: ${error instanceof Error ? error.message : String(error)}`, 'error');
               return { success: false, error: error.message };
          }

          return { success: true, data: data || [] };
     } catch (error) {
          log(`Error fetching tenant profiles: ${error instanceof Error ? error.message : String(error)}`, 'error');
          return { success: false, error: 'Failed to fetch profiles' };
     }
}

/**
 * Create a new tenant profile
 */
export async function createTenantProfile(payload: CreateTenantProfilePayload): Promise<ActionResponse<TenantProfile>> {
     try {
          const viewer = await getViewer();
          // Allow both tenants and customers to have social profiles
          const actorId = viewer.tenant?.id ?? viewer.customer?.id ?? null;
          if (!actorId) {
               return { success: false, error: 'User not authenticated' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Check if profile already exists
          const { data: existingProfile } = await supabase
               .from(TABLES.TENANT_PROFILES)
               .select('id')
               .eq('tenant_id', actorId)
               .maybeSingle();

          if (existingProfile) {
               return { success: false, error: 'Profile already exists' };
          }

          // Get current tenant data for shared fields when acting as a tenant
          let tenantData: { first_name?: string; last_name?: string; phone_number?: string | null } | null = null;
          if (viewer.tenant) {
               const { data } = await supabase
                    .from(TABLES.TENANTS)
                    .select('first_name, last_name, phone_number')
                    .eq('id', viewer.tenant.id)
                    .maybeSingle();
               tenantData = data as any;
          }

          // Prepare profile data with shared fields from tenant
          const profileData = {
               tenant_id: actorId,
               ...payload,
               // Override with shared fields from tenant if not provided in payload
               first_name: payload.first_name || tenantData?.first_name || '',
               last_name: payload.last_name || tenantData?.last_name || '',
               phone_number: (payload.phone_number ?? tenantData?.phone_number) ?? undefined,
          };

          // Calculate profile progress
          const profile_progress = calculateProfileProgress(profileData);

          // Create the profile
          const { data, error } = await supabase
               .from(TABLES.TENANT_PROFILES)
               .insert({
                    ...profileData,
                    profile_progress,
               })
               .select()
               .single();

          if (error) {
               log(`Error creating tenant profile: ${error instanceof Error ? error.message : String(error)}`, 'error');
               return { success: false, error: error.message };
          }

          // Update tenant table with shared fields if they were provided in payload
          // Only applicable when the current viewer is a tenant
          if (viewer.tenant && (payload.first_name || payload.last_name || payload.phone_number)) {
               const tenantUpdates: any = {};
               if (payload.first_name) tenantUpdates.first_name = payload.first_name;
               if (payload.last_name) tenantUpdates.last_name = payload.last_name;
               if (payload.phone_number !== undefined) tenantUpdates.phone_number = payload.phone_number;

               if (Object.keys(tenantUpdates).length > 0) {
                    tenantUpdates.updated_at = new Date().toISOString();
                    await supabase
                         .from(TABLES.TENANTS)
                         .update(tenantUpdates)
                         .eq('id', viewer.tenant.id);
               }
          }

          revalidatePath('/dashboard/social');

          return { success: true, data };
     } catch (error) {
          log(`Error creating tenant profile: ${error instanceof Error ? error.message : String(error)}`, 'error');
          return { success: false, error: 'Failed to create profile' };
     }
}

/**
 * Update a tenant profile
 */
export async function updateTenantProfile(
     profileId: string,
     payload: UpdateTenantProfilePayload
): Promise<ActionResponse<TenantProfile>> {
     log(`Updating tenant profile ${profileId} with payload: ${JSON.stringify(payload)}`);
     try {
          const viewer = await getViewer();
          const actorId = viewer.tenant?.id ?? viewer.customer?.id ?? null;
          if (!actorId) {
               return { success: false, error: 'User not authenticated' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Verify ownership (user can only update their own profile)
          const { data: profile } = await supabase
               .from(TABLES.TENANT_PROFILES)
               .select('tenant_id')
               .eq('id', profileId)
               .single();

          if (!profile) {
               log('Profile not found for update', 'error');
               return { success: false, error: 'Profile not found' };
          }

          if (profile.tenant_id !== actorId) {
               log('Attempt to update profile not owned by user', 'error');
               return { success: false, error: 'You can only update your own profile' };
          }

          // First sync shared fields to tenant
          const sharedFields = ['first_name', 'last_name', 'phone_number', 'avatar_url', 'date_of_birth'];
          const tenantUpdates: any = {};
          for (const field of sharedFields) {
               if (payload[field as keyof UpdateTenantProfilePayload] !== undefined) {
                    tenantUpdates[field] = payload[field as keyof UpdateTenantProfilePayload];
               }
          }

          if (viewer.tenant && Object.keys(tenantUpdates).length > 0) {
               tenantUpdates.updated_at = new Date().toISOString();
               const { error: tenantError } = await supabase
                    .from(TABLES.TENANTS)
                    .update(tenantUpdates)
                    .eq('id', viewer.tenant.id);
               if (tenantError) {
                    log(`Error updating tenant shared fields: ${JSON.stringify(tenantError)}`, 'error');
                    return { success: false, error: tenantError.message };
               }
          }

          // Calculate profile progress based on updated data
          const { data: currentData } = await supabase
               .from(TABLES.TENANT_PROFILES)
               .select('*')
               .eq('id', profileId)
               .single();

          if (!currentData) {
               return { success: false, error: 'Profile data not found' };
          }

          const updatedData = { ...currentData, ...payload };
          const profile_progress = calculateProfileProgress(updatedData);

          // Update profile
          const { data, error } = await supabase
               .from(TABLES.TENANT_PROFILES)
               .update({
                    ...payload,
                    profile_progress,
                    updated_at: new Date().toISOString(),
               })
               .eq('id', profileId)
               .select()
               .single();

          if (error) {
               log(`Error updating tenant profile: ${error instanceof Error ? error.message : String(error)}`, 'error');
               return { success: false, error: error.message };
          }

          revalidatePath('/dashboard/social');

          return { success: true, data };
     } catch (error) {
          log(`Error updating tenant profile: ${error instanceof Error ? error.message : String(error)}`, 'error');
          return { success: false, error: 'Failed to update profile' };
     }
}
/**
 * Delete a tenant profile
 */
export async function deleteTenantProfile(profileId: string): Promise<ActionResponse<void>> {
     try {
          const viewer = await getViewer();
          const actorId = viewer.tenant?.id ?? viewer.customer?.id ?? null;
          if (!actorId) {
               return { success: false, error: 'User not authenticated' };
          }

          const supabase = await useServerSideSupabaseAnonClient();

          // Verify ownership
          const { data: profile } = await supabase
               .from(TABLES.TENANT_PROFILES)
               .select('tenant_id')
               .eq('id', profileId)
               .single();

          if (!profile) {
               return { success: false, error: 'Profile not found' };
          }

          if (profile.tenant_id !== actorId) {
               return { success: false, error: 'You can only delete your own profile' };
          }

          const { error } = await supabase
               .from(TABLES.TENANT_PROFILES)
               .delete()
               .eq('id', profileId);

          if (error) {
               log(`Error deleting tenant profile: ${error instanceof Error ? error.message : String(error)}`, 'error');
               return { success: false, error: error.message };
          }

          revalidatePath('/dashboard/social');

          return { success: true };
     } catch (error) {
          log(`Error deleting tenant profile: ${error instanceof Error ? error.message : String(error)}`, 'error');
          return { success: false, error: 'Failed to delete profile' };
     }
}


/**
 * Get tenant profile by profile id or fallback to tenant_id foreign key.
 */
export async function getProfileIdOrTenantId(id: string): Promise<ActionResponse<TenantProfile>> {
     try {
          const supabase = await useServerSideSupabaseAnonClient();

          const { data, error } = await supabase
               .from(TABLES.TENANT_PROFILES)
               .select('*')
               .or(`id.eq.${id},tenant_id.eq.${id}`)
               .limit(1)
               .maybeSingle();
          if (error) {
               log(`Error fetching tenant profile by id or tenant_id: ${error instanceof Error ? error.message : String(error)}`, 'error');
               return { success: false, error: error.message };
          }
          if (!data) {
               return { success: false, error: 'Profile not found' };
          }
          return { success: true, data };
     } catch (error) {
          log(`Error fetching tenant profile by id or tenant_id: ${error instanceof Error ? error.message : String(error)}`, 'error');
          return { success: false, error: 'Failed to fetch profile' };
     }
}
