'use server';

import { revalidatePath } from "next/cache";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { readClientOrClientIDFromClientMemberID } from "../client/client-members";
import { logServerAction } from "src/libs/supabase/server-logging";
import { Apartment } from "src/types/apartment";
import { validate as isUUID } from "uuid";
import { toStorageRef } from "src/utils/sb-bucket";
import { TABLES } from "src/libs/supabase/tables";

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

export async function getAllApartments(): Promise<{ success: boolean; error?: string; data?: Apartment[] }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { data: apartments, error } = await supabase
          .from(TABLES.APARTMENTS)
          .select(`
              *,
              building:tblBuildings (
                   id,
                   building_location:tblBuildingLocations!tblBuildings_building_location_fkey (
                        street_address,
                        street_number,
                        city
                   )
              )
         `);
     if (error) {
          await logServerAction({ action: "getAllApartments", duration_ms: Date.now() - t0, error: error.message, payload: {}, status: "fail", type: "db", user_id: null });
          return { success: false, error: error.message };
     }

     // fetch image rows (raw refs)
     const { data: imageRows } = await supabase
          .from(TABLES.APARTMENT_IMAGES)
          .select("id, created_at, updated_at, storage_bucket, storage_path, is_cover_image, apartment_id");

     const imagesByApt = new Map<string, any[]>();
     (imageRows ?? []).forEach(r => {
          const arr = imagesByApt.get(r.apartment_id) ?? [];
          arr.push({
               id: r.id,
               created_at: r.created_at,
               updated_at: r.updated_at,
               storage_bucket: r.storage_bucket ?? DEFAULT_BUCKET,
               storage_path: r.storage_path,
               is_cover_image: !!(r as any).is_cover_image,
               apartment_id: r.apartment_id,
          });
          imagesByApt.set(r.apartment_id, arr);
     });

     const data: Apartment[] = (apartments ?? []).map(a => ({
          ...a,
          apartment_images: imagesByApt.get(a.id) ?? [],
     }));

     await logServerAction({ action: "getAllapartments", duration_ms: Date.now() - t0, error: "", payload: {}, status: "success", type: "db", user_id: null });
     return { success: true, data };
}

export async function getAllApartmentsFromClientsBuildings(clientid: string) {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { data: resolvedClientOrMemberId } = await readClientOrClientIDFromClientMemberID(clientid);
     const { data: buildings, error: buildingsError } = await supabase
          .from(TABLES.BUILDINGS)
          .select("*")
          .eq("client_id", typeof resolvedClientOrMemberId === "string" ? resolvedClientOrMemberId : resolvedClientOrMemberId!.id);

     if (buildingsError) {
          await logServerAction({ action: "getAllApartmentsFromClientsBuildings", duration_ms: Date.now() - t0, error: buildingsError.message, payload: { clientid: resolvedClientOrMemberId }, status: "fail", type: "db", user_id: typeof resolvedClientOrMemberId === "string" ? resolvedClientOrMemberId : resolvedClientOrMemberId!.id, id: "" });
          return { success: false, error: buildingsError.message };
     }

     if (!buildings?.length) {
          await logServerAction({ action: "getAllApartmentsFromClientsBuildings", duration_ms: Date.now() - t0, error: "", payload: { clientid: resolvedClientOrMemberId }, status: "success", type: "db", user_id: typeof resolvedClientOrMemberId === "string" ? resolvedClientOrMemberId : resolvedClientOrMemberId!.id, id: "" });
          return { success: true, data: { apartments: [], building_images: [] } }; // keep shape
     }

     const { data: apartments, error: apartmentsError } = await supabase
          .from(TABLES.APARTMENTS)
          .select(`
              *,
              building:tblBuildings (
                   id,
                   building_location:tblBuildingLocations!tblBuildings_building_location_fkey (
                        street_address,
                        street_number,
                        city
                   )
              )
         `)
          .in("building_id", buildings.map(b => b.id));

     if (apartmentsError) {
          await logServerAction({ action: "getAllApartmentsFromClientsBuildings", duration_ms: Date.now() - t0, error: apartmentsError.message, payload: { clientid }, status: "fail", type: "db", user_id: clientid, id: "" });
          return { success: false, error: apartmentsError.message };
     }

     // sign apartment images for these apartments
     const aptIds = (apartments ?? []).map(a => a.id);
     let imagesByApt = new Map<string, any[]>();

     if (aptIds.length) {
          const { data: imageRows } = await supabase
               .from(TABLES.APARTMENT_IMAGES)
               .select("id, created_at, updated_at, storage_bucket, storage_path, is_cover_image, apartment_id")
               .in("apartment_id", aptIds);

          imagesByApt = new Map();
          (imageRows ?? []).forEach(r => {
               const arr = imagesByApt.get(r.apartment_id) ?? [];
               arr.push({
                    id: r.id,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                    storage_bucket: r.storage_bucket ?? DEFAULT_BUCKET,
                    storage_path: r.storage_path,
                    is_cover_image: !!(r as any).is_cover_image,
                    apartment_id: r.apartment_id,
               });
               imagesByApt.set(r.apartment_id, arr);
          });
     }

     await logServerAction({ action: "getAllApartmentsFromClientsBuildings", duration_ms: Date.now() - t0, error: "", payload: { clientid }, status: "success", type: "db", user_id: clientid, id: "" });
     // Return apartments with image rows attached (legacy building_images field omitted; not used by callers)
     const apartmentsWithImages: Apartment[] = (apartments ?? []).map(a => ({
          ...a,
          apartment_images: imagesByApt.get(a.id) ?? [],
     }));
     return { success: true, data: { apartments: apartmentsWithImages, building_images: [] } };
}

export async function getApartmentsFromClientsBuilding(clientid: string, buildingid: string): Promise<{ success: boolean; error?: string; data?: Apartment[] }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase
          .from(TABLES.APARTMENTS)
          .select(`
              *,
              building:tblBuildings (
                   id,
                   building_location:tblBuildingLocations!tblBuildings_building_location_fkey (
                        street_address,
                        street_number,
                        city
                   )
              )
         `)
          .eq("building_id", buildingid);

     if (error) {
          await logServerAction({ action: "getApartmentsFromClientsBuilding", duration_ms: Date.now() - t0, error: error.message, payload: { clientid, buildingid }, status: "fail", type: "db", user_id: clientid, id: buildingid });
          return { success: false, error: error.message };
     }

     await logServerAction({ action: "getApartmentsFromClientsBuilding", duration_ms: Date.now() - t0, error: "", payload: { clientid, buildingid }, status: "success", type: "db", user_id: clientid, id: buildingid });
     return { success: true, data };
}

export async function getApartmentById(id: string): Promise<{ success: boolean; error?: string; data?: Apartment }> {
     const t0 = Date.now();
     if (!isUUID(id)) return { success: false, error: "Invalid UUID" };

     const supabase = await useServerSideSupabaseAnonClient();

     const { data: apartment, error } = await supabase
          .from(TABLES.APARTMENTS)
          .select(`
              *,
              building:tblBuildings (
                   id,
                   building_location:tblBuildingLocations!tblBuildings_building_location_fkey (
                        street_address,
                        street_number,
                        city
                   )
              )
         `)
          .eq("id", id)
          .single();

     if (error) {
          await logServerAction({ action: "getApartmentById", duration_ms: Date.now() - t0, error: error.message, payload: { id }, status: "fail", type: "db", user_id: null, id: "" });
          return { success: false, error: error.message };
     }

     const { data: imageRows } = await supabase
          .from(TABLES.APARTMENT_IMAGES)
          .select("id, created_at, updated_at, storage_bucket, storage_path, is_cover_image, apartment_id")
          .eq("apartment_id", id);

     await logServerAction({ action: "getApartmentById", duration_ms: Date.now() - t0, error: "", payload: { id }, status: "success", type: "db", user_id: null, id: "" });

     return {
          success: true,
          data: {
               ...apartment,
               apartment_images: (imageRows ?? []).map(r => ({
                    id: r.id,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                    storage_bucket: r.storage_bucket ?? DEFAULT_BUCKET,
                    storage_path: r.storage_path,
                    is_cover_image: !!(r as any).is_cover_image,
                    apartment_id: r.apartment_id,
               })),
          }
     };
}

export async function createOrUpdateApartment(payload: Apartment) {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { apartment_images, id, ...apartmentPayload } = payload;

     if (id) {
          // UPDATE
          delete (apartmentPayload as any).created_at;
          delete (apartmentPayload as any).updated_at;

          const { data, error } = await supabase
               .from(TABLES.APARTMENTS)
               .update(apartmentPayload)
               .eq("id", id)
               .select()
               .single();

          if (error) {
               await logServerAction({ action: "updateApartment", duration_ms: Date.now() - t0, error: error.message, payload, status: "fail", type: "db", user_id: null });
               return { success: false, error: error.message };
          }

          if (apartment_images) {
               const refs = apartment_images.map(toStorageRef).filter(Boolean) as Array<{ bucket: string; path: string }>;
               await supabase.from(TABLES.APARTMENT_IMAGES).delete().eq("apartment_id", id);
               if (refs.length) {
                    await supabase.from(TABLES.APARTMENT_IMAGES).insert(
                         refs.map(r => ({ apartment_id: id, storage_bucket: r.bucket, storage_path: r.path }))
                    );
               }
          }

          await logServerAction({ action: "updateApartment", duration_ms: Date.now() - t0, error: "", payload, status: "success", type: "db", user_id: null });
          return { success: true, data };
     } else {
          // CREATE
          (apartmentPayload as any).created_at = new Date();
          (apartmentPayload as any).updated_at = new Date();

          // enforce building capacity
          const { data: building, error: buildingError } = await supabase
               .from(TABLES.BUILDINGS)
               .select("number_of_apartments")
               .eq("id", (apartmentPayload as any).building_id)
               .single();

          if (buildingError) {
               await logServerAction({ action: "createApartment", duration_ms: Date.now() - t0, error: buildingError.message, payload, status: "fail", type: "db", user_id: null, id: "" });
               return { success: false, error: "Failed to fetch building data." };
          }

          const maxApts = building?.number_of_apartments ?? 0;

          const { count, error: countError } = await supabase
               .from(TABLES.APARTMENTS)
               .select("id", { count: "exact", head: true })
               .eq("building_id", (apartmentPayload as any).building_id);

          if (countError) {
               await logServerAction({ action: "createApartment", duration_ms: Date.now() - t0, error: countError.message, payload, status: "fail", type: "db", user_id: null, id: "" });
               return { success: false, error: "Failed to count apartments for building." };
          }

          if ((count ?? 0) >= maxApts) {
               return { success: false, error: "Maximum number of apartments for this building has been reached." };
          }

          const { data, error } = await supabase
               .from(TABLES.APARTMENTS)
               .insert(apartmentPayload)
               .select()
               .single();

          if (error) {
               await logServerAction({ action: "createApartment", duration_ms: Date.now() - t0, error: error.message, payload, status: "fail", type: "db", user_id: null, id: "" });
               return { success: false, error: error.message };
          }

          if (apartment_images?.length) {
               const refs = apartment_images.map(toStorageRef).filter(Boolean) as Array<{ bucket: string; path: string }>;
               if (refs.length) {
                    await supabase.from(TABLES.APARTMENT_IMAGES).insert(
                         refs.map(r => ({ apartment_id: data.id, storage_bucket: r.bucket, storage_path: r.path }))
                    );
               }
          }

          await logServerAction({ action: "createApartment", duration_ms: Date.now() - t0, error: "", payload, status: "success", type: "db", user_id: null, id: "" });
          return { success: true, data };
     }
}

export async function deleteApartment(id: string) {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     // 1) fetch image refs
     const { data: imgs } = await supabase
          .from(TABLES.APARTMENT_IMAGES)
          .select("storage_bucket, storage_path")
          .eq("apartment_id", id);

     // 2) remove from storage (group by bucket)
     if (imgs?.length) {
          const byBucket = new Map<string, string[]>();
          for (const r of imgs) {
               const bucket = r.storage_bucket ?? DEFAULT_BUCKET;
               const path = r.storage_path; // legacy rows may be null; in that case we skip
               if (!path) continue;
               const arr = byBucket.get(bucket) ?? [];
               arr.push(path);
               byBucket.set(bucket, arr);
          }
          for (const [bucket, paths] of byBucket) {
               if (!paths.length) continue;
               const { error: delErr } = await supabase.storage.from(bucket).remove(paths);
               if (delErr) {
                    await logServerAction({ action: "deleteApartment - storage remove failed", duration_ms: Date.now() - t0, error: delErr.message, payload: { id, bucket, count: paths.length }, status: "fail", type: "db", user_id: null });
                    // we keep going to try DB cleanup anyway
               }
          }
     }

     // 3) delete DB image rows
     await supabase.from(TABLES.APARTMENT_IMAGES).delete().eq("apartment_id", id);

     // 4) delete the apartment
     const { error } = await supabase.from(TABLES.APARTMENTS).delete().eq("id", id);
     if (error) {
          await logServerAction({ action: "deleteApartment", duration_ms: Date.now() - t0, error: error.message, payload: { id }, status: "fail", type: "db", user_id: null });
          return { success: false, error: error.message };
     }

     await logServerAction({ action: "deleteApartment", duration_ms: Date.now() - t0, error: "", payload: { id }, status: "success", type: "db", user_id: null });
     revalidatePath('/dashboard/apartments');
     return { success: true, data: null };
}

export async function checkIfApartmentExistsInBuilding(buildingId: string, apartmentNumber: string): Promise<{ exists: boolean, apartmentid?: string }> {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     if (!buildingId || !apartmentNumber) {
          return { exists: false };
     }

     const { data, error } = await supabase
          .from(TABLES.APARTMENTS)
          .select("id")
          .eq("building_id", buildingId)
          .eq("apartment_number", apartmentNumber)
          .limit(1);

     if (error) {
          await logServerAction({ action: "checkIfApartmentExistsInBuilding", duration_ms: Date.now() - t0, error: error.message, payload: { buildingId, apartmentNumber }, status: "fail", type: "db", user_id: null });
          return { exists: false };
     }
     return { exists: !!data?.length, apartmentid: data?.[0]?.id };
}
