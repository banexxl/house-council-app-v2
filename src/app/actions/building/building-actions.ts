'use server';

import { logServerAction } from "src/libs/supabase/server-logging";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { Building } from "src/types/building";
import { validate as isUUID } from 'uuid';
import { removeAllImagesFromBuilding } from "src/libs/supabase/sb-storage";

/** * Get all buildings
 */
export const getAllBuildings = async (): Promise<{ success: boolean; error?: string; data?: Building[] }> => {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const [{ data: buildings, error }, { data: imageRecords }] =
          await Promise.all([
               supabase
                    .from("tblBuildings")
                    .select(`*, building_location:tblBuildingLocations!tblBuildings_building_location_fkey (*)`),
               supabase
                    .from("tblBuildingImages")
                    .select("building_id, image_url"),
          ]);

     if (error) {
          await logServerAction({
               action: "getAllBuildings",
               duration_ms: Date.now() - time,
               error: error.message,
               payload: {},
               status: "fail",
               type: "db",
               user_id: null,
               id: "",
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          action: "getAllBuildings",
          duration_ms: Date.now() - time,
          error: "",
          payload: {},
          status: "success",
          type: "db",
          user_id: null,
          id: "",
     });

     return { success: true, data: buildings ?? [] };
}

/**
 * Get all buildings from a client
 */
export async function getAllBuildingsFromClient(
     client_id: string
): Promise<{ success: boolean; error?: string; data?: Building[] }> {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const [{ data: buildings, error }, { data: imageRecords }] =
          await Promise.all([
               supabase
                    .from("tblBuildings")
                    .select(`*, building_location:tblBuildingLocations!tblBuildings_building_location_fkey (*)`)
                    .eq("client_id", client_id),
               supabase
                    .from("tblBuildingImages")
                    .select("building_id, image_url"),
          ]);

     if (error) {
          await logServerAction({
               action: "getAllBuildingsFromClient",
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { client_id },
               status: "fail",
               type: "db",
               user_id: client_id,
               id: "",
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          action: "getAllBuildingsFromClient",
          duration_ms: Date.now() - time,
          error: "",
          payload: { client_id },
          status: "success",
          type: "db",
          user_id: client_id,
          id: "",
     });

     return { success: true, data: buildings ?? [] };
}

/**
 * GET building by ID
 */
export async function getBuildingById(id: string): Promise<{ success: boolean, error?: string, data?: Building }> {
     const time = Date.now();
     if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };

     const supabase = await useServerSideSupabaseAnonClient();

     const [{ data: building, error }, { data: imageRecords }] = await Promise.all([
          supabase
               .from('tblBuildings')
               .select(`*, building_location:tblBuildingLocations!tblBuildings_building_location_fkey (*)`)
               .eq('id', id)
               .single(),
          supabase
               .from('tblBuildingImages')
               .select('building_id, image_url')
               .eq('building_id', id)
     ]);

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'getBuildingById',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          user_id: null,
          action: 'getBuildingById',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id },
          status: 'success',
          type: 'db',


     });

     return {
          success: true,
          data: {
               ...building,
               building_images: imageRecords?.map((img) => img.image_url) ?? [],
          }
     };
}

/**
 * CREATE a new building
 */
export async function createBuilding(payload: Building): Promise<{ success: boolean, error?: string, data?: Building | null }> {

     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { id, building_images, ...buildingPayload } = payload;
     const building_location_id = payload.building_location?.id;
     const payloadData = { ...buildingPayload, building_location: building_location_id };

     const { data: buildingData, error: insertError } = await supabase
          .from('tblBuildings')
          .insert(payloadData)
          .select()
          .single();

     if (insertError) {
          await logServerAction({
               user_id: null,
               action: 'createBuilding',
               duration_ms: Date.now() - time,
               error: insertError.message,
               payload: payloadData,
               status: 'fail',
               type: 'db',


          });
          return { success: false, error: insertError.message };
     }

     // Insert building images
     if (building_images?.length) {
          const imageInserts = building_images.map(url => ({ building_id: buildingData.id, image_url: url }));
          await supabase.from('tblBuildingImages').insert(imageInserts);
     }

     // Check if location already has a building
     const { data: existingLocation, error: fetchError } = await supabase
          .from('tblBuildingLocations')
          .select('building_id')
          .eq('id', building_location_id)
          .single();

     if (fetchError) {
          await supabase.from('tblBuildings').delete().eq('id', buildingData.id);
          await logServerAction({
               user_id: null,
               action: 'createBuilding',
               duration_ms: Date.now() - time,
               error: fetchError.message,
               payload: payloadData,
               status: 'fail',
               type: 'db',


          });
          return { success: false, error: 'Failed to verify building location' };
     }

     if (existingLocation?.building_id) {
          await supabase.from('tblBuildings').delete().eq('id', buildingData.id);
          await logServerAction({
               user_id: null,
               action: 'createBuilding',
               duration_ms: Date.now() - time,
               error: 'Location is already assigned to another building',
               payload: payloadData,
               status: 'fail',
               type: 'db',


          });
          return { success: false, error: 'Location is already assigned to another building' };
     }

     await supabase
          .from('tblBuildingLocations')
          .update({ building_id: buildingData.id })
          .match({ id: building_location_id });

     await logServerAction({
          user_id: null,
          action: 'createBuilding',
          duration_ms: Date.now() - time,
          error: '',
          payload: payloadData,
          status: 'success',
          type: 'db',


     });

     return { success: true, data: buildingData };
}

/**
 * UPDATE a building
 */
export async function updateBuilding(id: string, updates: Partial<Building>): Promise<{ success: boolean, error?: string, data?: Building }> {

     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { building_images, ...buildingUpdate } = updates;
     const updatePayload = {
          ...buildingUpdate,
          building_location: updates.building_location?.id,
     };

     const { data, error } = await supabase
          .from('tblBuildings')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'updateBuilding',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id, updates },
               status: 'fail',
               type: 'db',

          });
          return { success: false, error: error.message };
     }

     // Replace existing images
     if (building_images) {
          const { error: deleteError } = await supabase.from('tblBuildingImages').delete().eq('building_id', id);
          const newImages = building_images.map(image => ({ building_id: id, image_url: image }));
          const { error: insertError } = await supabase.from('tblBuildingImages').insert(newImages);
     }

     await logServerAction({
          user_id: null,
          action: 'updateBuilding',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id, updates },
          status: 'success',
          type: 'db',

     });

     return { success: true, data };
}

/**
 * DELETE a building
 */
export async function deleteBuilding(id: string): Promise<{ success: boolean, error?: string, data?: null }> {

     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     // Need to delete the images from SB S3 because if we delete from tblBuildingImages first, removeAllImagesFromBuilding wont even try to delete them
     const { success, error } = await removeAllImagesFromBuilding(id);

     if (!success) {
          await logServerAction({
               user_id: null,
               action: 'Delete Building - deleting images from SB S3 failed.',
               duration_ms: Date.now() - time,
               error: error!,
               payload: { id },
               status: 'fail',
               type: 'db',

          })
     }
     // Delete related images
     const { error: deleteImagesError } = await supabase.from('tblBuildingImages').delete().eq('building_id', id);

     if (deleteImagesError) {
          await logServerAction({
               user_id: null,
               action: 'Delete Building - deleting images from tblBuildingImages failed.',
               duration_ms: Date.now() - time,
               error: deleteImagesError.message,
               payload: { id },
               status: 'fail',
               type: 'db',

          });
     }
     // Find linked location
     const { data: location, error: locationError } = await supabase
          .from('tblBuildingLocations')
          .select('id')
          .eq('building_id', id)
          .single();

     if (locationError && locationError.code !== 'PGRST116') {
          await logServerAction({
               user_id: null,
               action: 'Delete Building - failed to check building location',
               duration_ms: Date.now() - time,
               error: locationError.message,
               payload: { id },
               status: 'fail',
               type: 'db',

          });
          return { success: false, error: 'Failed to check building location' };
     }

     if (location?.id) {
          await supabase.from('tblBuildingLocations').delete().eq('id', location.id);
     }

     const { error: deleteError } = await supabase.from('tblBuildings').delete().eq('id', id);
     if (deleteError) {
          await logServerAction({
               user_id: null,
               action: 'Delete Building - failed to delete building from tblBuildings',
               duration_ms: Date.now() - time,
               error: deleteError.message,
               payload: { id },
               status: 'fail',
               type: 'db',

          });
          return { success: false, error: deleteError.message };
     }

     await logServerAction({
          user_id: null,
          action: 'Delete Building - Success',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id },
          status: 'success',
          type: 'db',

     });

     return { success: true, data: null };
}