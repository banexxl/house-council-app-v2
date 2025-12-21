'use server';

import { logServerAction } from "src/libs/supabase/server-logging";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { resolveClientFromClientOrMember } from "../client/client-members";
import { Building, BuildingImage } from "src/types/building";
import { removeAllEntityFiles } from "src/libs/supabase/sb-storage";
import { validate as isUUID } from 'uuid';
import { toStorageRef } from "src/utils/sb-bucket";
import { TABLES } from "src/libs/supabase/tables";
import log from "src/utils/logger";

// ===== Actions =====

/** Get notification emails for one or more buildings (Tenants, Client Members, Client) */
export const getNotificationEmailsForBuildings = async (
     supabase: Awaited<ReturnType<typeof useServerSideSupabaseAnonClient>>,
     buildingIds: string[]
): Promise<string[]> => {
     const emails = new Set<string>();
     const uniqueBuildingIds = Array.from(new Set((buildingIds || []).filter(Boolean)));
     if (!uniqueBuildingIds.length) return [];

     // 1) Client + client email(s) for these buildings
     const { data: buildingRows } = await supabase
          .from(TABLES.BUILDINGS!)
          .select('id, client_id, client:client_id ( email )')
          .in('id', uniqueBuildingIds);

     const clientIds = Array.from(
          new Set(
               (buildingRows || [])
                    .map((row: any) => {
                         const clientEmail = row?.client?.email as string | undefined;
                         if (clientEmail) emails.add(clientEmail);
                         return row?.client_id as string | undefined;
                    })
                    .filter(Boolean)
          )
     ) as string[];

     // 2) Client members for those clients
     if (clientIds.length) {
          const { data: clientMembers } = await supabase
               .from(TABLES.CLIENT_MEMBERS!)
               .select('email, client_id')
               .in('client_id', clientIds);

          (clientMembers || []).forEach((m: any) => {
               if (m?.email) emails.add(m.email as string);
          });
     }

     // 3) Tenants in these buildings (via apartments)
     const { data: apartments } = await supabase
          .from(TABLES.APARTMENTS!)
          .select('id, building_id')
          .in('building_id', uniqueBuildingIds);

     const apartmentIds = (apartments || []).map((a: any) => a.id).filter(Boolean);
     if (apartmentIds.length) {
          const { data: tenants } = await supabase
               .from(TABLES.TENANTS!)
               .select('email')
               .in('apartment_id', apartmentIds);

          (tenants || []).forEach((t: any) => {
               const email = t?.email;
               if (email) emails.add(email as string);
          });
     }

     return Array.from(emails);
};

/** Get all buildings */
export const getAllBuildings = async (): Promise<{ success: boolean; error?: string; data?: Building[] }> => {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { data: buildings, error } = await supabase
          .from(TABLES.BUILDINGS!)
          .select(`*, building_location:tblBuildingLocations!tblBuildings_building_location_fkey (*)`);

     if (error) {
          await logServerAction({ action: "getAllBuildings", duration_ms: Date.now() - t0, error: error.message, payload: {}, status: "fail", type: "db", user_id: null, id: "" });
          return { success: false, error: error.message };
     }

     // Fetch image rows (raw refs) for each building
     const { data: imageRows } = await supabase
          .from(TABLES.BUILDING_IMAGES!)
          .select("id, created_at, updated_at, storage_bucket, storage_path, is_cover_image, building_id");

     // Group by building
     const imagesByBuilding = new Map<string, any[]>();
     (imageRows ?? []).forEach(r => {
          const arr = imagesByBuilding.get(r.building_id) ?? [];
          arr.push({
               id: r.id,
               created_at: r.created_at,
               updated_at: r.updated_at,
               storage_bucket: r.storage_bucket,
               storage_path: r.storage_path,
               is_cover_image: !!(r as any).is_cover_image,
               building_id: r.building_id,
          });
          imagesByBuilding.set(r.building_id, arr);
     });

     const data: Building[] = (buildings ?? []).map(b => ({
          ...b,
          building_images: imagesByBuilding.get(b.id) ?? [],
     }));

     await logServerAction({ action: "getAllBuildings", duration_ms: Date.now() - t0, error: "", payload: {}, status: "success", type: "db", user_id: null, id: "" });
     return { success: true, data };
};

/** Get all buildings from a client */
export async function getAllBuildingsFromClient(
     client_id: string
): Promise<{ success: boolean; error?: string; data?: Building[] }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { data: resolvedClientData } = await resolveClientFromClientOrMember(client_id);
     const resolvedClientId = resolvedClientData?.id!
     const { data: buildings, error } = await supabase
          .from(TABLES.BUILDINGS!)
          .select(`*, building_location:tblBuildingLocations!tblBuildings_building_location_fkey (*)`)
          .eq("client_id", resolvedClientId);

     if (error) {
          await logServerAction({ action: "getAllBuildingsFromClient", duration_ms: Date.now() - t0, error: error.message, payload: { client_id: resolvedClientId }, status: "fail", type: "db", user_id: resolvedClientId, id: "" });
          return { success: false, error: error.message };
     }

     const ids = (buildings ?? []).map(b => b.id);
     let imagesByBuilding = new Map<string, any[]>();

     if (ids.length) {
          const { data: imageRows } = await supabase
               .from(TABLES.BUILDING_IMAGES!)
               .select("id, created_at, updated_at, storage_bucket, storage_path, is_cover_image, building_id")
               .in("building_id", ids);

          imagesByBuilding = new Map();
          (imageRows ?? []).forEach(r => {
               const arr = imagesByBuilding.get(r.building_id) ?? [];
               arr.push({
                    id: r.id,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                    storage_bucket: r.storage_bucket,
                    storage_path: r.storage_path,
                    is_cover_image: !!(r as any).is_cover_image,
                    building_id: r.building_id,
               });
               imagesByBuilding.set(r.building_id, arr);
          });
     }

     const data: Building[] = (buildings ?? []).map(b => ({
          ...b,
          building_images: imagesByBuilding.get(b.id) ?? [],
     }));

     await logServerAction({ action: "getAllBuildingsFromClient", duration_ms: Date.now() - t0, error: "", payload: { client_id: resolvedClientId }, status: "success", type: "db", user_id: resolvedClientId, id: "" });
     return { success: true, data };
}

/** GET building by ID */
export async function getBuildingById(id: string): Promise<{ success: boolean, error?: string, data?: Building }> {
     const t0 = Date.now();
     if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };

     const supabase = await useServerSideSupabaseAnonClient();

     const { data: building, error } = await supabase
          .from(TABLES.BUILDINGS!)
          .select(`*, building_location:tblBuildingLocations!tblBuildings_building_location_fkey (*)`)
          .eq('id', id)
          .single();

     if (error) {
          await logServerAction({ user_id: null, action: 'getBuildingById', duration_ms: Date.now() - t0, error: error.message, payload: { id }, status: 'fail', type: 'db' });
          return { success: false, error: error.message };
     }

     // Get image rows (raw storage refs)
     const { data: imageRows } = await supabase
          .from(TABLES.BUILDING_IMAGES!)
          .select('id, created_at, updated_at, storage_bucket, storage_path, is_cover_image, building_id')
          .eq('building_id', id);

     await logServerAction({ user_id: null, action: 'getBuildingById', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db' });

     return {
          success: true,
          data: {
               ...building,
               building_images: (imageRows ?? []).map(r => ({
                    id: r.id,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                    storage_bucket: r.storage_bucket,
                    storage_path: r.storage_path,
                    is_cover_image: !!(r as any).is_cover_image,
                    building_id: r.building_id,
               })),
          }
     };
}

/** CREATE a new building */
export async function createBuilding(payload: Building): Promise<{ success: boolean, error?: string, data?: Building | null }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { id, building_images, ...buildingPayload } = payload;
     const building_location_id = payload.building_location?.id;
     const payloadData = { ...buildingPayload, building_location: building_location_id };

     const { data: buildingData, error: insertError } = await supabase
          .from(TABLES.BUILDINGS!)
          .insert(payloadData)
          .select()
          .single();

     if (insertError) {
          await logServerAction({ user_id: null, action: 'createBuilding', duration_ms: Date.now() - t0, error: insertError.message, payload: payloadData, status: 'fail', type: 'db' });
          return { success: false, error: insertError.message };
     }

     // Insert building images (normalize to storage refs first)
     if (building_images?.length) {
          const rows = mapBuildingImagesForInsert(buildingData.id, building_images);
          if (rows.length) {
               await supabase.from('tblBuildingImages').insert(rows);
          }
     }

     // Ensure location is not already bound
     const { data: existingLocation, error: fetchError } = await supabase
          .from(TABLES.BUILDING_LOCATIONS!)
          .select('building_id')
          .eq('id', building_location_id)
          .single();

     if (fetchError) {
          await supabase.from(TABLES.BUILDINGS!).delete().eq('id', buildingData.id);
          await logServerAction({ user_id: null, action: 'createBuilding', duration_ms: Date.now() - t0, error: fetchError.message, payload: payloadData, status: 'fail', type: 'db' });
          return { success: false, error: 'Failed to verify building location' };
     }

     if (existingLocation?.building_id) {
          await supabase.from(TABLES.BUILDINGS!).delete().eq('id', buildingData.id);
          await logServerAction({ user_id: null, action: 'createBuilding', duration_ms: Date.now() - t0, error: 'Location is already assigned to another building', payload: payloadData, status: 'fail', type: 'db' });
          return { success: false, error: 'Location is already assigned to another building' };
     }

     await supabase
          .from(TABLES.BUILDING_LOCATIONS!)
          .update({ building_id: buildingData.id })
          .match({ id: building_location_id });

     await logServerAction({ user_id: null, action: 'createBuilding', duration_ms: Date.now() - t0, error: '', payload: payloadData, status: 'success', type: 'db' });

     return { success: true, data: buildingData };
}

const mapBuildingImagesForInsert = (building_id: string, images?: (string | BuildingImage)[]) => {
     if (!images?.length) return [];
     return images
          .map(img => {
               const ref = toStorageRef(img as any);
               if (!ref) return null;
               const typed = img as any;
               return {
                    building_id,
                    storage_bucket: ref.bucket,
                    storage_path: ref.path,
                    is_cover_image: !!typed?.is_cover_image,
               };
          })
          .filter(Boolean) as Array<{ building_id: string; storage_bucket: string; storage_path: string; is_cover_image: boolean }>;
};

/** UPDATE a building */
export async function updateBuilding(id: string, updates: Partial<Building>): Promise<{ success: boolean, error?: string, data?: Building }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { building_images, ...buildingUpdate } = updates;
     const updatePayload = {
          ...buildingUpdate,
          building_location: updates.building_location?.id,
     };

     const { data, error } = await supabase
          .from(TABLES.BUILDINGS!)
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();

     if (error) {
          await logServerAction({ user_id: null, action: 'updateBuilding', duration_ms: Date.now() - t0, error: error.message, payload: { id, updates }, status: 'fail', type: 'db' });
          return { success: false, error: error.message };
     }

     // Replace images if provided
     if (building_images) {
          // remove existing rows
          await supabase.from(TABLES.BUILDING_IMAGES!).delete().eq('building_id', id);

          const rows = mapBuildingImagesForInsert(id, building_images);
          if (rows.length) {
               await supabase.from(TABLES.BUILDING_IMAGES!).insert(rows);
          }
     }

     await logServerAction({ user_id: null, action: 'updateBuilding', duration_ms: Date.now() - t0, error: '', payload: { id, updates }, status: 'success', type: 'db' });
     return { success: true, data };
}

/** DELETE a building */
export async function deleteBuilding(id: string): Promise<{ success: boolean, error?: string, data?: null }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     // Delete from Storage first (kept as-is; ensure it uses storage_bucket/storage_path internally)
     const removeMediaResult = await removeAllEntityFiles({
          entity: 'building-image',
          entityId: id,
     });
     if (!removeMediaResult.success) {
          await logServerAction({ user_id: null, action: 'Delete Building - deleting images via helper failed.', duration_ms: Date.now() - t0, error: removeMediaResult.error ?? 'Unknown error', payload: { id }, status: 'fail', type: 'storage' });
     }

     // Clear linked location
     const { data: location, error: locationError } = await supabase
          .from(TABLES.BUILDING_LOCATIONS!)
          .select('id')
          .eq('building_id', id)
          .single();

     if (locationError && locationError.code !== 'PGRST116') {
          await logServerAction({ user_id: null, action: 'Delete Building - failed to check building location', duration_ms: Date.now() - t0, error: locationError.message, payload: { id }, status: 'fail', type: 'db' });
          return { success: false, error: 'Failed to check building location' };
     }

     if (location?.id) {
          await supabase.from('tblBuildingLocations').delete().eq('id', location.id);
     }

     const { error: deleteError } = await supabase.from(TABLES.BUILDINGS!).delete().eq('id', id);
     if (deleteError) {
          await logServerAction({ user_id: null, action: 'Delete Building - failed to delete building from tblBuildings', duration_ms: Date.now() - t0, error: deleteError.message, payload: { id }, status: 'fail', type: 'db' });
          return { success: false, error: deleteError.message };
     }

     await logServerAction({ user_id: null, action: 'Delete Building - Success', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db' });
     return { success: true, data: null };
}

/** GET Building IDs from User ID */
export const getBuildingIDsFromUserId = async (user_id: string): Promise<{ success: boolean; error?: string; data?: string[] }> => {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     try {
          // 1) Find tenant → apartment(s)
          const { data: tenantRows, error: tenantErr } = await supabase
               .from(TABLES.TENANTS!)
               .select('apartment_id')
               .eq('user_id', user_id);
          if (tenantErr) {
               log(`Error fetching tenant rows for user_id ${user_id}: ${tenantErr.message}`);
               await logServerAction({ action: 'getBuildingsFromUserId', duration_ms: Date.now() - t0, error: tenantErr.message, payload: { user_id }, status: 'fail', type: 'db', user_id: null, id: '' });
               return { success: false, error: tenantErr.message };
          }
          const apartmentIds = (tenantRows || []).map(r => r.apartment_id).filter(Boolean);
          if (apartmentIds.length === 0) {
               log(`No apartments found for user_id ${user_id}`);
               await logServerAction({ action: 'getBuildingsFromUserId', duration_ms: Date.now() - t0, error: '', payload: { user_id, apartments: 0 }, status: 'success', type: 'db', user_id: null, id: '' });
               return { success: true, data: [] };
          }

          // 2) Fetch apartments → building ids
          const { data: apartmentRows, error: aptErr } = await supabase
               .from(TABLES.APARTMENTS!)
               .select('id, building_id')
               .in('id', apartmentIds);
          if (aptErr) {
               log(`Error fetching apartment rows for user_id ${user_id}: ${aptErr.message}`);
               await logServerAction({ action: 'getBuildingsFromUserId', duration_ms: Date.now() - t0, error: aptErr.message, payload: { user_id, apartmentIds }, status: 'fail', type: 'db', user_id: null, id: '' });
               return { success: false, error: aptErr.message };
          }
          const buildingIds = Array.from(new Set((apartmentRows || []).map(r => r.building_id).filter(Boolean)));
          if (buildingIds.length === 0) {
               log(`No buildings found for user_id ${user_id}`);
               await logServerAction({ action: 'getBuildingsFromUserId', duration_ms: Date.now() - t0, error: '', payload: { user_id, apartments: apartmentIds.length, buildings: 0 }, status: 'success', type: 'db', user_id: null, id: '' });
               return { success: true, data: [] };
          }

          await logServerAction({ action: 'getBuildingsFromUserId', duration_ms: Date.now() - t0, error: '', payload: { user_id, buildingCount: (buildingIds || []).length }, status: 'success', type: 'db', user_id: null, id: '' });
          return { success: true, data: buildingIds };
     } catch (e: any) {
          log(`Unexpected error in getBuildingIDsFromUserId for user_id ${user_id}: ${e?.message || e}`);
          await logServerAction({ action: 'getBuildingsFromUserId', duration_ms: Date.now() - t0, error: e?.message || 'unexpected', payload: { user_id }, status: 'fail', type: 'db', user_id: null, id: '' });
          return { success: false, error: e?.message || 'Unexpected error' };
     }
}

/** Resolve building address from building ID */
export const getBuildingAddressFromId = async (
     building_id: string
): Promise<{ success: boolean; error?: string; data?: string }> => {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data: loc, error } = await supabase
               .from(TABLES.BUILDING_LOCATIONS!)
               .select('street_address, street_number, city')
               .eq('building_id', building_id)
               .maybeSingle();

          if (error) {
               log(`Error resolving building address for building_id ${building_id}: ${error.message}`);
               await logServerAction({
                    action: 'getBuildingAddressFromId',
                    duration_ms: Date.now() - t0,
                    error: error.message,
                    payload: { building_id },
                    status: 'fail',
                    type: 'db',
                    user_id: null,
                    id: '',
               });
               return { success: false, error: error.message };
          }

          const streetAddress = (loc as any)?.street_address ?? '';
          const streetNumber = (loc as any)?.street_number ?? '';
          const city = (loc as any)?.city ?? '';

          const parts = [streetAddress, streetNumber, city].filter(Boolean);
          const fullAddress = parts.join(' ').trim();

          await logServerAction({
               action: 'getBuildingAddressFromId',
               duration_ms: Date.now() - t0,
               error: '',
               payload: { building_id },
               status: 'success',
               type: 'db',
               user_id: null,
               id: '',
          });

          return { success: true, data: fullAddress || undefined };
     } catch (e: any) {
          log(`Unexpected error resolving building address for building_id ${building_id}: ${e?.message || e}`);
          await logServerAction({
               action: 'getBuildingAddressFromId',
               duration_ms: Date.now() - t0,
               error: e?.message || 'unexpected',
               payload: { building_id },
               status: 'fail',
               type: 'db',
               user_id: null,
               id: '',
          });
          return { success: false, error: e?.message || 'Unexpected error' };
     }
};