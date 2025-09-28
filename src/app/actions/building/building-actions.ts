'use server';

import { logServerAction } from "src/libs/supabase/server-logging";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { resolveClientId } from "../client/client-members";
import { Building } from "src/types/building";
import { validate as isUUID } from 'uuid';
import { removeAllImagesFromBuilding } from "src/libs/supabase/sb-storage";
import { toStorageRef } from "src/utils/sb-bucket";

// ===== Helpers =====

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1h
const DEFAULT_BUCKET = process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET!;

/** Batch-sign many paths, grouped by bucket. Returns map bucket+path → signedUrl. */
async function signMany(
     supabase: Awaited<ReturnType<typeof useServerSideSupabaseAnonClient>>,
     refs: Array<{ bucket: string; path: string }>
) {
     const byBucket = new Map<string, string[]>();
     refs.forEach(r => {
          const arr = byBucket.get(r.bucket) ?? [];
          arr.push(r.path);
          byBucket.set(r.bucket, arr);
     });

     const out = new Map<string, string>();
     for (const [bucket, paths] of byBucket) {
          if (!paths.length) continue;
          const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
          if (error) continue;
          data?.forEach((d, i) => {
               if (d?.signedUrl) out.set(`${bucket}::${paths[i]}`, d.signedUrl);
          });
     }
     return out;
}

// ===== Actions =====

/** Get all buildings */
export const getAllBuildings = async (): Promise<{ success: boolean; error?: string; data?: Building[] }> => {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { data: buildings, error } = await supabase
          .from("tblBuildings")
          .select(`*, building_location:tblBuildingLocations!tblBuildings_building_location_fkey (*)`);

     if (error) {
          await logServerAction({ action: "getAllBuildings", duration_ms: Date.now() - t0, error: error.message, payload: {}, status: "fail", type: "db", user_id: null, id: "" });
          return { success: false, error: error.message };
     }

     // Fetch image storage refs
     const { data: imageRows } = await supabase
          .from("tblBuildingImages")
          .select("building_id, storage_bucket, storage_path");

     // Sign images (batch)
     const refs = (imageRows ?? []).map(r => ({ bucket: r.storage_bucket ?? DEFAULT_BUCKET, path: r.storage_path }));
     const signedMap = await signMany(supabase, refs);

     // Attach signed URLs per building
     const imagesByBuilding = new Map<string, string[]>();
     (imageRows ?? []).forEach(r => {
          const key = `${r.storage_bucket ?? DEFAULT_BUCKET}::${r.storage_path}`;
          const url = signedMap.get(key);
          if (!url) return;
          const arr = imagesByBuilding.get(r.building_id) ?? [];
          arr.push(url);
          imagesByBuilding.set(r.building_id, arr);
     });

     const data: Building[] = (buildings ?? []).map(b => ({
          ...b,
          // If your Building type expects `building_images: string[]`
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

     const resolvedClientId = await resolveClientId(client_id);
     const { data: buildings, error } = await supabase
          .from("tblBuildings")
          .select(`*, building_location:tblBuildingLocations!tblBuildings_building_location_fkey (*)`)
          .eq("client_id", resolvedClientId);

     if (error) {
          await logServerAction({ action: "getAllBuildingsFromClient", duration_ms: Date.now() - t0, error: error.message, payload: { client_id: resolvedClientId }, status: "fail", type: "db", user_id: resolvedClientId, id: "" });
          return { success: false, error: error.message };
     }

     const ids = (buildings ?? []).map(b => b.id);
     let imagesByBuilding = new Map<string, string[]>();

     if (ids.length) {
          const { data: imageRows } = await supabase
               .from("tblBuildingImages")
               .select("building_id, storage_bucket, storage_path")
               .in("building_id", ids);

          const refs = (imageRows ?? []).map(r => ({ bucket: r.storage_bucket ?? DEFAULT_BUCKET, path: r.storage_path }));
          const signedMap = await signMany(supabase, refs);

          imagesByBuilding = new Map();
          (imageRows ?? []).forEach(r => {
               const key = `${r.storage_bucket ?? DEFAULT_BUCKET}::${r.storage_path}`;
               const url = signedMap.get(key);
               if (!url) return;
               const arr = imagesByBuilding.get(r.building_id) ?? [];
               arr.push(url);
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
          .from('tblBuildings')
          .select(`*, building_location:tblBuildingLocations!tblBuildings_building_location_fkey (*)`)
          .eq('id', id)
          .single();

     if (error) {
          await logServerAction({ user_id: null, action: 'getBuildingById', duration_ms: Date.now() - t0, error: error.message, payload: { id }, status: 'fail', type: 'db' });
          return { success: false, error: error.message };
     }

     // Get image refs and sign
     const { data: imageRows } = await supabase
          .from('tblBuildingImages')
          .select('storage_bucket, storage_path')
          .eq('building_id', id);

     const refs = (imageRows ?? []).map(r => ({ bucket: r.storage_bucket ?? DEFAULT_BUCKET, path: r.storage_path }));
     const signedMap = await signMany(supabase, refs);
     const signed = (imageRows ?? [])
          .map(r => signedMap.get(`${r.storage_bucket ?? DEFAULT_BUCKET}::${r.storage_path}`))
          .filter(Boolean) as string[];

     await logServerAction({ user_id: null, action: 'getBuildingById', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db' });

     return { success: true, data: { ...building, building_images: signed } };
}

/** CREATE a new building */
export async function createBuilding(payload: Building): Promise<{ success: boolean, error?: string, data?: Building | null }> {
     const t0 = Date.now();
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
          await logServerAction({ user_id: null, action: 'createBuilding', duration_ms: Date.now() - t0, error: insertError.message, payload: payloadData, status: 'fail', type: 'db' });
          return { success: false, error: insertError.message };
     }

     // Insert building images (normalize to storage refs first)
     if (building_images?.length) {
          const refs = building_images
               .map(toStorageRef)
               .filter(Boolean) as Array<{ bucket: string; path: string }>;

          if (refs.length) {
               const rows = refs.map(r => ({
                    building_id: buildingData.id,
                    storage_bucket: r.bucket,
                    storage_path: r.path,
               }));
               await supabase.from('tblBuildingImages').insert(rows);
          }
     }

     // Ensure location is not already bound
     const { data: existingLocation, error: fetchError } = await supabase
          .from('tblBuildingLocations')
          .select('building_id')
          .eq('id', building_location_id)
          .single();

     if (fetchError) {
          await supabase.from('tblBuildings').delete().eq('id', buildingData.id);
          await logServerAction({ user_id: null, action: 'createBuilding', duration_ms: Date.now() - t0, error: fetchError.message, payload: payloadData, status: 'fail', type: 'db' });
          return { success: false, error: 'Failed to verify building location' };
     }

     if (existingLocation?.building_id) {
          await supabase.from('tblBuildings').delete().eq('id', buildingData.id);
          await logServerAction({ user_id: null, action: 'createBuilding', duration_ms: Date.now() - t0, error: 'Location is already assigned to another building', payload: payloadData, status: 'fail', type: 'db' });
          return { success: false, error: 'Location is already assigned to another building' };
     }

     await supabase
          .from('tblBuildingLocations')
          .update({ building_id: buildingData.id })
          .match({ id: building_location_id });

     await logServerAction({ user_id: null, action: 'createBuilding', duration_ms: Date.now() - t0, error: '', payload: payloadData, status: 'success', type: 'db' });

     return { success: true, data: buildingData };
}

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
          .from('tblBuildings')
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
          // normalize
          const refs = building_images
               .map(toStorageRef)
               .filter(Boolean) as Array<{ bucket: string; path: string }>;

          // remove existing rows
          await supabase.from('tblBuildingImages').delete().eq('building_id', id);

          if (refs.length) {
               const rows = refs.map(r => ({
                    building_id: id,
                    storage_bucket: r.bucket,
                    storage_path: r.path,
               }));
               await supabase.from('tblBuildingImages').insert(rows);
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
     const { success, error } = await removeAllImagesFromBuilding(id);
     if (!success) {
          await logServerAction({ user_id: null, action: 'Delete Building - deleting images from SB S3 failed.', duration_ms: Date.now() - t0, error: error!, payload: { id }, status: 'fail', type: 'db' });
     }

     // Delete related image rows
     const { error: deleteImagesError } = await supabase.from('tblBuildingImages').delete().eq('building_id', id);
     if (deleteImagesError) {
          await logServerAction({ user_id: null, action: 'Delete Building - deleting images from tblBuildingImages failed.', duration_ms: Date.now() - t0, error: deleteImagesError.message, payload: { id }, status: 'fail', type: 'db' });
     }

     // Clear linked location
     const { data: location, error: locationError } = await supabase
          .from('tblBuildingLocations')
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

     const { error: deleteError } = await supabase.from('tblBuildings').delete().eq('id', id);
     if (deleteError) {
          await logServerAction({ user_id: null, action: 'Delete Building - failed to delete building from tblBuildings', duration_ms: Date.now() - t0, error: deleteError.message, payload: { id }, status: 'fail', type: 'db' });
          return { success: false, error: deleteError.message };
     }

     await logServerAction({ user_id: null, action: 'Delete Building - Success', duration_ms: Date.now() - t0, error: '', payload: { id }, status: 'success', type: 'db' });
     return { success: true, data: null };
}

export const getBuildingIDsFromUserId = async (user_id: string): Promise<{ success: boolean; error?: string; data?: string[] }> => {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     try {
          // 1) Find tenant → apartment(s)
          const { data: tenantRows, error: tenantErr } = await supabase
               .from('tblTenants')
               .select('apartment_id')
               .eq('user_id', user_id);
          if (tenantErr) {
               await logServerAction({ action: 'getBuildingsFromUserId', duration_ms: Date.now() - t0, error: tenantErr.message, payload: { user_id }, status: 'fail', type: 'db', user_id: null, id: '' });
               return { success: false, error: tenantErr.message };
          }
          const apartmentIds = (tenantRows || []).map(r => r.apartment_id).filter(Boolean);
          if (apartmentIds.length === 0) {
               await logServerAction({ action: 'getBuildingsFromUserId', duration_ms: Date.now() - t0, error: '', payload: { user_id, apartments: 0 }, status: 'success', type: 'db', user_id: null, id: '' });
               return { success: true, data: [] };
          }

          // 2) Fetch apartments → building ids
          const { data: apartmentRows, error: aptErr } = await supabase
               .from('tblApartments')
               .select('id, building_id')
               .in('id', apartmentIds);
          if (aptErr) {
               await logServerAction({ action: 'getBuildingsFromUserId', duration_ms: Date.now() - t0, error: aptErr.message, payload: { user_id, apartmentIds }, status: 'fail', type: 'db', user_id: null, id: '' });
               return { success: false, error: aptErr.message };
          }
          const buildingIds = Array.from(new Set((apartmentRows || []).map(r => r.building_id).filter(Boolean)));
          if (buildingIds.length === 0) {
               await logServerAction({ action: 'getBuildingsFromUserId', duration_ms: Date.now() - t0, error: '', payload: { user_id, apartments: apartmentIds.length, buildings: 0 }, status: 'success', type: 'db', user_id: null, id: '' });
               return { success: true, data: [] };
          }

          await logServerAction({ action: 'getBuildingsFromUserId', duration_ms: Date.now() - t0, error: '', payload: { user_id, buildingCount: (buildingIds || []).length }, status: 'success', type: 'db', user_id: null, id: '' });
          return { success: true, data: buildingIds };
     } catch (e: any) {
          await logServerAction({ action: 'getBuildingsFromUserId', duration_ms: Date.now() - t0, error: e?.message || 'unexpected', payload: { user_id }, status: 'fail', type: 'db', user_id: null, id: '' });
          return { success: false, error: e?.message || 'Unexpected error' };
     }
}
