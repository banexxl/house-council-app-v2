'use server';

import { logServerAction } from "src/libs/supabase/server-logging";
import { useServerSideSupabaseServiceRoleClient } from "src/libs/supabase/sb-server";
import { Building } from "src/types/building";
import { validate as isUUID } from 'uuid';

// GET all buildings
export async function getAllBuildingsFromClient(client_id: string): Promise<{ success: boolean, error?: string, data?: Building[] }> {

     const time = Date.now();
     const supabase = await useServerSideSupabaseServiceRoleClient()

     const { data, error } = await supabase
          .from('tblBuildings')
          .select(`
               *,
               building_location:tblBuildingLocations!tblBuildings_building_location_fkey (
                 id,
                 street_address,
                 street_number,
                 city,
                 region,
                 country,
                 post_code,
                 latitude,
                 longitude,
                 created_at,
                 updated_at
               )
             `)
          .eq('client_id', client_id);

     if (error) {
          await logServerAction({
               action: 'getAllBuildingsFromClient',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { client_id },
               status: 'fail',
               type: 'db',
               user_id: client_id,
               id: '',
          })
          return { success: false, error: error.message };
     }
     await logServerAction({
          action: 'getAllBuildingsFromClient',
          duration_ms: Date.now() - time,
          error: '',
          payload: { client_id },
          status: 'success',
          type: 'db',
          user_id: client_id,
          id: '',
     })
     return { success: true, data: data as Building[] };
}

// GET single building by ID
export async function getBuildingById(id: string): Promise<{ success: boolean, error?: string, data?: Building }> {

     const isValidUUIDv4 = isUUID(id);

     if (!isValidUUIDv4) {
          return { success: false, error: 'Invalid UUID' };
     }
     const time = Date.now();
     const supabase = await useServerSideSupabaseServiceRoleClient()


     const { data, error } = await supabase
          .from('tblBuildings')
          .select(`
               *,
               building_location:tblBuildingLocations!tblBuildings_building_location_fkey (
                 id,
                 street_address,
                 street_number,
                 city,
                 region,
                 country,
                 post_code,
                 latitude,
                 longitude,
                 created_at,
                 updated_at
               )
             `)
          .eq('id', id)
          .single();

     if (error) {
          await logServerAction({
               action: 'getBuildingById',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id },
               status: 'fail',
               type: 'db',
               user_id: '',
               id: '',
          })
          return { success: false, error: error.message };
     }

     await logServerAction({
          action: 'getBuildingById',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id },
          status: 'success',
          type: 'db',
          user_id: '',
          id: '',
     })
     return { success: true, data: data as Building };
}

// CREATE a new building
export async function createBuilding(payload: Omit<Building, 'id'>): Promise<{ success: boolean, error?: string, data?: Building | null }> {

     const time = Date.now();
     const supabase = await useServerSideSupabaseServiceRoleClient();

     const { data: buildingData, error: insertError } = await supabase
          .from('tblBuildings')
          .insert(payload)
          .select()
          .single();

     if (insertError) {
          await logServerAction({
               action: 'createBuilding',
               duration_ms: Date.now() - time,
               error: insertError.message,
               payload,
               status: 'fail',
               type: 'db',
               user_id: '',
               id: '',
          });
          return { success: false, error: insertError.message };
     }

     // 👉 Step 1: Check if location already has a building
     const { data: existingLocation, error: fetchError } = await supabase
          .from('tblBuildingLocations')
          .select('building_id')
          .eq('id', payload.building_location)
          .single();

     if (fetchError) {
          // Optional: clean up inserted building if location fetch fails
          await supabase.from('tblBuildings').delete().eq('id', buildingData.id);
          await logServerAction({
               action: 'createBuilding',
               duration_ms: Date.now() - time,
               error: fetchError.message,
               payload,
               status: 'fail',
               type: 'db',
               user_id: '',
               id: '',
          });
          return { success: false, error: 'Failed to verify building location' };
     }

     if (existingLocation?.building_id) {
          // ❌ Already assigned, delete inserted building
          await supabase.from('tblBuildings').delete().eq('id', buildingData.id);
          await logServerAction({
               action: 'createBuilding',
               duration_ms: Date.now() - time,
               error: 'Location is already assigned to another building',
               payload,
               status: 'fail',
               type: 'db',
               user_id: '',
               id: '',
          });
          return { success: false, error: 'Location is already assigned to another building' };
     }

     // ✅ Step 2: Safe to update the location
     const { status: updateStatus, count, error: updateError } = await supabase
          .from('tblBuildingLocations')
          .update({ building_id: buildingData.id })
          .match({ id: payload.building_location });

     if (updateError) {
          await logServerAction({
               action: 'createBuilding',
               duration_ms: Date.now() - time,
               error: updateError.message,
               payload,
               status: 'fail',
               type: 'db',
               user_id: '',
               id: '',
          });
          return { success: false, error: updateError.message };
     }

     await logServerAction({
          action: 'createBuilding',
          duration_ms: Date.now() - time,
          error: '',
          payload: `Updated ${updateStatus} building location: ${buildingData.id}`,
          status: 'success',
          type: 'db',
          user_id: '',
          id: '',
     });

     return { success: true, data: buildingData as Building };
}

// UPDATE a building
export async function updateBuilding(id: string, updates: Partial<Building>): Promise<{ success: boolean, error?: string, data?: Building }> {

     const buildingUpdate = {
          ...updates,
          building_location: updates.building_location ? updates.building_location.id : undefined,
     };
     console.log('buildingUpdate', buildingUpdate);

     const time = Date.now();
     const supabase = await useServerSideSupabaseServiceRoleClient()

     const { data, error } = await supabase
          .from('tblBuildings')
          .update(buildingUpdate)
          .eq('id', id)
          .select()
          .single();

     if (error) {
          await logServerAction({
               action: 'updateBuilding',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id, updates },
               status: 'fail',
               type: 'db',
               user_id: '',
          })
          return { success: false, error: error.message };
     }

     await logServerAction({
          action: 'updateBuilding',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id, updates },
          status: 'success',
          type: 'db',
          user_id: '',
     })
     return { success: true, data: data as Building };
}

// DELETE a building
export async function deleteBuilding(id: string): Promise<{ success: boolean, error?: string, data?: null }> {
     const time = Date.now();
     const supabase = await useServerSideSupabaseServiceRoleClient();

     // Step 1: Check for location with this building_id
     const { data: location, error: locationError } = await supabase
          .from('tblBuildingLocations')
          .select('id')
          .eq('building_id', id)
          .single();

     if (locationError && locationError.code !== 'PGRST116') {
          // PGRST116 = no rows found — acceptable; any other error = fail
          await logServerAction({
               action: 'deleteBuilding',
               duration_ms: Date.now() - time,
               error: locationError.message,
               payload: { id },
               status: 'fail',
               type: 'db',
               user_id: '',
          });
          return { success: false, error: 'Failed to check building location' };
     }

     // Step 2: Delete location if found
     if (location?.id) {
          const { error: deleteLocationError } = await supabase
               .from('tblBuildingLocations')
               .delete()
               .eq('id', location.id);

          if (deleteLocationError) {
               await logServerAction({
                    action: 'deleteBuilding',
                    duration_ms: Date.now() - time,
                    error: deleteLocationError.message,
                    payload: { id },
                    status: 'fail',
                    type: 'db',
                    user_id: '',
               });
               return { success: false, error: 'Failed to delete linked building location' };
          }
     }

     // Step 3: Delete the building
     const { error: deleteBuildingError } = await supabase
          .from('tblBuildings')
          .delete()
          .eq('id', id);

     if (deleteBuildingError) {
          await logServerAction({
               action: 'deleteBuilding',
               duration_ms: Date.now() - time,
               error: deleteBuildingError.message,
               payload: { id },
               status: 'fail',
               type: 'db',
               user_id: '',
          });
          return { success: false, error: deleteBuildingError.message };
     }

     await logServerAction({
          action: 'deleteBuilding',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id },
          status: 'success',
          type: 'db',
          user_id: '',
     });

     return { success: true, data: null };
}

