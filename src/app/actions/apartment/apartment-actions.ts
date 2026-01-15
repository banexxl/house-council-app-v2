'use server';

import { revalidatePath } from "next/cache";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { logServerAction } from "src/libs/supabase/server-logging";
import { Apartment } from "src/types/apartment";
import { validate as isUUID } from "uuid";
import { toStorageRef } from "src/utils/sb-bucket";
import { TABLES } from "src/libs/supabase/tables";
import { ApartmentImage } from "src/types/apartment";
import { syncPolarSeatsForClient } from "src/libs/polar/sync-subscription-seats";

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
               storage_bucket: r.storage_bucket,
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

export async function getAllApartmentsFromCustomersBuildings(customerId: string) {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { data: buildings, error: buildingsError } = await supabase
          .from(TABLES.BUILDINGS)
          .select("*")
          .eq("customerId", customerId);

     if (buildingsError) {
          await logServerAction({ action: "getAllApartmentsFromCustomersBuildings", duration_ms: Date.now() - t0, error: buildingsError.message, payload: { customerId }, status: "fail", type: "db", user_id: customerId, id: "" });
          return { success: false, error: buildingsError.message };
     }

     if (!buildings?.length) {
          await logServerAction({ action: "getAllApartmentsFromCustomersBuildings", duration_ms: Date.now() - t0, error: "", payload: { customerId }, status: "success", type: "db", user_id: customerId, id: "" });
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
          await logServerAction({ action: "getAllApartmentsFromCustomersBuildings", duration_ms: Date.now() - t0, error: apartmentsError.message, payload: { customerId }, status: "fail", type: "db", user_id: customerId, id: "" });
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
                    storage_bucket: r.storage_bucket,
                    storage_path: r.storage_path,
                    is_cover_image: !!(r as any).is_cover_image,
                    apartment_id: r.apartment_id,
               });
               imagesByApt.set(r.apartment_id, arr);
          });
     }

     await logServerAction({ action: "getAllApartmentsFromCustomersBuildings", duration_ms: Date.now() - t0, error: "", payload: { customerId }, status: "success", type: "db", user_id: customerId, id: "" });
     // Return apartments with image rows attached (legacy building_images field omitted; not used by callers)
     const apartmentsWithImages: Apartment[] = (apartments ?? []).map(a => ({
          ...a,
          apartment_images: imagesByApt.get(a.id) ?? [],
     }));
     return { success: true, data: { apartments: apartmentsWithImages, building_images: [] } };
}

export async function getApartmentsFromCustomerBuilding(customerid: string, buildingid: string): Promise<{ success: boolean; error?: string; data?: Apartment[] }> {
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
          await logServerAction({ action: "getApartmentsFromCustomersBuilding", duration_ms: Date.now() - t0, error: error.message, payload: { customerid, buildingid }, status: "fail", type: "db", user_id: customerid, id: buildingid });
          return { success: false, error: error.message };
     }

     await logServerAction({ action: "getApartmentsFromCustomersBuilding", duration_ms: Date.now() - t0, error: "", payload: { customerid, buildingid }, status: "success", type: "db", user_id: customerid, id: buildingid });
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
                    storage_bucket: r.storage_bucket,
                    storage_path: r.storage_path,
                    is_cover_image: !!(r as any).is_cover_image,
                    apartment_id: r.apartment_id,
               })),
          }
     };
}

const mapApartmentImagesForInsert = (apartment_id: string, images?: (string | ApartmentImage)[]) => {
     if (!images?.length) return [];
     return images
          .map(img => {
               const ref = toStorageRef(img as any);
               if (!ref) return null;
               const typed = img as any;
               return {
                    apartment_id,
                    storage_bucket: ref.bucket,
                    storage_path: ref.path,
                    is_cover_image: !!typed?.is_cover_image,
               };
          })
          .filter(Boolean) as Array<{ apartment_id: string; storage_bucket: string; storage_path: string; is_cover_image: boolean }>;
};

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
               await supabase.from(TABLES.APARTMENT_IMAGES).delete().eq("apartment_id", id);
               const rows = mapApartmentImagesForInsert(id, apartment_images);
               if (rows.length) {
                    await supabase.from(TABLES.APARTMENT_IMAGES).insert(rows);
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
               .select("customerId,number_of_apartments")
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
               const rows = mapApartmentImagesForInsert(data.id, apartment_images);
               if (rows.length) {
                    await supabase.from(TABLES.APARTMENT_IMAGES).insert(rows);
               }
          }

          // ✅ NEW: sync Polar seats
          // You must know the clientId here.
          // If apartmentPayload has customerId, use it.
          // Otherwise derive clientId from the building.
          const customerId = building.customerId

          const sync = await syncPolarSeatsForClient({ customerId });

          if (!sync.success) {
               // rollback the apartment creation
               await supabase.from(TABLES.APARTMENTS).delete().eq("id", data.id);

               await logServerAction({
                    action: "createApartment",
                    duration_ms: Date.now() - t0,
                    error: `Apartment created but Polar seat sync failed: ${sync.error}`,
                    payload,
                    status: "fail",
                    type: "api",
                    user_id: null,
                    id: data.id,
               });

               return { success: false, error: `Apartment was not saved because billing sync failed: ${sync.error}` };
          }

          await logServerAction({ action: "createApartment", duration_ms: Date.now() - t0, error: "", payload, status: "success", type: "db", user_id: null, id: "" });
          return { success: true, data };
     }
}

export async function deleteApartment(id: string) {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     // 0) Resolve clientId BEFORE deleting anything
     const { data: aptRow, error: aptErr } = await supabase
          .from(TABLES.APARTMENTS)
          .select("building_id")
          .eq("id", id)
          .single();

     if (aptErr) {
          await logServerAction({
               action: "deleteApartment - resolve building_id failed",
               duration_ms: Date.now() - t0,
               error: aptErr.message,
               payload: { id },
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false, error: "Failed to resolve apartment building." };
     }

     const buildingId = (aptRow as any)?.building_id;

     const { data: building, error: buildingError } = await supabase
          .from(TABLES.BUILDINGS)
          .select("customerId")
          .eq("id", buildingId)
          .single();

     if (buildingError) {
          await logServerAction({
               action: "deleteApartment - resolve customerId failed",
               duration_ms: Date.now() - t0,
               error: buildingError.message,
               payload: { id, buildingId },
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false, error: "Failed to resolve client for apartment." };
     }

     const customerId = (building as any)?.customerId as string | undefined;
     if (!customerId) {
          await logServerAction({
               action: "deleteApartment - customerId missing",
               duration_ms: Date.now() - t0,
               error: "customerId is null",
               payload: { id, buildingId },
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false, error: "Customer could not be resolved for this apartment." };
     }

     // 1) fetch image refs
     const { data: imgs } = await supabase
          .from(TABLES.APARTMENT_IMAGES)
          .select("storage_bucket, storage_path")
          .eq("apartment_id", id);

     // 2) remove from storage (group by bucket)
     if (imgs?.length) {
          const byBucket = new Map<string, string[]>();
          for (const r of imgs as any[]) {
               const bucket = r.storage_bucket;
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
                    await logServerAction({
                         action: "deleteApartment - storage remove falied",
                         duration_ms: Date.now() - t0,
                         error: delErr.message,
                         payload: { id, bucket, count: paths.length },
                         status: "fail",
                         type: "db",
                         user_id: null,
                    });
                    // continue to try DB cleanup anyway
               }
          }
     }

     // 3) delete DB image rows
     const { error: imgDbErr } = await supabase
          .from(TABLES.APARTMENT_IMAGES)
          .delete()
          .eq("apartment_id", id);

     if (imgDbErr) {
          await logServerAction({
               action: "deleteApartment - image rows delete failed",
               duration_ms: Date.now() - t0,
               error: imgDbErr.message,
               payload: { id },
               status: "fail",
               type: "db",
               user_id: null,
          });
          // continue to try deleting apartment anyway
     }

     // 4) delete the apartment
     const { error } = await supabase.from(TABLES.APARTMENTS).delete().eq("id", id);

     if (error) {
          await logServerAction({
               action: "deleteApartment",
               duration_ms: Date.now() - t0,
               error: error.message,
               payload: { id },
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false, error: error.message };
     }

     // 5) ✅ sync Polar seats AFTER delete
     const sync = await syncPolarSeatsForClient({ customerId });

     if (!sync.success) {
          await logServerAction({
               action: "deleteApartment - polar seat sync failed",
               duration_ms: Date.now() - t0,
               error: sync.error ?? "Unknown Polar sync error",
               payload: { id, customerId },
               status: "fail",
               type: "api",
               user_id: null,
          });

          // NOTE: we cannot easily rollback a hard delete here without soft delete.
          return {
               success: false,
               error:
                    "Apartment deleted, but billing sync failed. Please try again or contact support.",
          };
     }

     await logServerAction({
          action: "deleteApartment",
          duration_ms: Date.now() - t0,
          error: "",
          payload: { id, customerId, newQuantity: sync.usage },
          status: "success",
          type: "db",
          user_id: null,
     });

     revalidatePath("/dashboard/apartments");
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
