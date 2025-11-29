"use server";

import { revalidatePath } from "next/cache";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { logServerAction } from "src/libs/supabase/server-logging";
import { BuildingLocation } from "src/types/location";
import { resolveClientFromClientOrMember } from "../client/client-members";
import { TABLES } from "src/libs/supabase/tables";
import { useServerSideSupabaseServiceRoleClient } from "src/libs/supabase/sb-server";

type ErrorResponse = {
     code: string;
     details: string | null;
     hint: string | null;
     message: string;
};

const enrichLocationsWithExtras = async (
     supabase: any,
     locations: BuildingLocation[]
): Promise<Array<BuildingLocation & { building_cover_bucket?: string; building_cover_path?: string; client_name?: string }>> => {
     if (!locations?.length) return [];

     const buildingIds = Array.from(new Set(locations.map((l) => l.building_id).filter(Boolean))) as string[];
     const clientIds = Array.from(new Set(locations.map((l) => l.client_id).filter(Boolean))) as string[];

     const coverByBuilding = new Map<string, { storage_bucket: string; storage_path: string }>();
     if (buildingIds.length) {
          const { data: covers } = await supabase
               .from(TABLES.BUILDING_IMAGES)
               .select("building_id, storage_bucket, storage_path, is_cover_image")
               .in("building_id", buildingIds)
               .eq("is_cover_image", true);
          (covers || []).forEach((c: any) => {
               if (c.building_id && c.storage_bucket && c.storage_path) {
                    coverByBuilding.set(c.building_id, {
                         storage_bucket: c.storage_bucket,
                         storage_path: c.storage_path,
                    });
               }
          });
     }

     const clientNameById = new Map<string, string>();
     if (clientIds.length) {
          const { data: clients } = await supabase
               .from(TABLES.CLIENTS)
               .select("id, name, contact_person")
               .in("id", clientIds);
          (clients || []).forEach((c: any) => {
               clientNameById.set(c.id, c.name || c.contact_person || c.id);
          });
     }

     return locations.map((loc) => {
          const cover = loc.building_id ? coverByBuilding.get(loc.building_id) : undefined;
          const clientName = clientNameById.get(loc.client_id);
          return {
               ...loc,
               location_occupied: !!(loc.building_id && loc.building_id !== ""),
               building_cover_bucket: cover?.storage_bucket,
               building_cover_path: cover?.storage_path,
               client_name: clientName,
          };
     });
};

// Get all locations (admin use)
export const getAllLocations = async () => {
     const supabase = await useServerSideSupabaseAnonClient();
     const serviceSupabase = await useServerSideSupabaseServiceRoleClient();
     const { data, error } = await supabase.from(TABLES.BUILDING_LOCATIONS).select("*");
     if (error) return { success: false, error: error.message };
     const enriched = await enrichLocationsWithExtras(serviceSupabase, data || []);
     return { success: true, data: enriched };
};

export const insertLocationAction = async (
     values: BuildingLocation
): Promise<{ success: boolean; error?: ErrorResponse; data?: BuildingLocation }> => {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { data: resolvedForInsert } = await resolveClientFromClientOrMember(values.client_id);
     const client_id = resolvedForInsert?.id!;

     if (
          !values ||
          !values.location_id?.trim() ||
          !values.street_address?.trim() ||
          !values.city?.trim() ||
          !values.country?.trim() ||
          !values.street_number?.trim() ||
          !client_id.trim()
     ) {
          await logServerAction({
               action: "insertLocationAction",
               duration_ms: Date.now() - t0,
               error: "Invalid location data provided",
               payload: values,
               status: "fail",
               type: "db",
               user_id: null,
               id: values.id || "",
          });
          return { success: false, error: { code: "22P02", details: null, hint: null, message: "Invalid location data provided" } };
     }

     try {
          // Pre-check duplicates by location_id
          const { data: existingLocation, error: fetchError } = await supabase
               .from(TABLES.BUILDING_LOCATIONS)
               .select("id")
               .eq("location_id", values.location_id);
          if (fetchError) {
               await logServerAction({
                    action: "insertLocationAction",
                    duration_ms: Date.now() - t0,
                    error: fetchError.message,
                    payload: values,
                    status: "fail",
                    type: "db",
                    user_id: null,
                    id: values.id || "",
               });
               return { success: false, error: fetchError };
          }

          if (existingLocation && existingLocation.length > 0) {
               // secondary uniqueness check (street + city + number)
               const { data: duplicateLocation, error: duplicateError } = await supabase
                    .from(TABLES.BUILDING_LOCATIONS)
                    .select("id")
                    .eq("location_id", values.location_id)
                    .eq("street_address", values.street_address)
                    .eq("city", values.city)
                    .eq("street_number", values.street_number);
               if (duplicateError) {
                    await logServerAction({
                         action: "insertLocationAction",
                         duration_ms: Date.now() - t0,
                         error: duplicateError.message,
                         payload: values,
                         status: "fail",
                         type: "db",
                         user_id: null,
                         id: values.id || "",
                    });
                    return { success: false, error: duplicateError };
               }
               if (duplicateLocation && duplicateLocation.length > 0) {
                    await logServerAction({
                         action: "insertLocationAction",
                         duration_ms: Date.now() - t0,
                         error: "Location already exists",
                         payload: values,
                         status: "fail",
                         type: "db",
                         user_id: null,
                         id: values.id || "",
                    });
                    return { success: false, error: { code: "23505", details: null, hint: null, message: "Location already exists" } };
               }
          }

          const insertPayload = {
               client_id,
               location_id: values.location_id,
               street_address: values.street_address,
               city: values.city,
               region: values.region,
               country: values.country,
               street_number: values.street_number,
               created_at: new Date().toISOString(),
               latitude: values.latitude,
               longitude: values.longitude,
               post_code: values.post_code,
          };
          const { data, error } = await supabase.from(TABLES.BUILDING_LOCATIONS).insert(insertPayload).select("*");
          if (error) {
               await logServerAction({
                    action: "insertLocationAction",
                    duration_ms: Date.now() - t0,
                    error: error.message,
                    payload: values,
                    status: "fail",
                    type: "db",
                    user_id: null,
                    id: values.id || "",
               });
               return { success: false, error };
          }
          await logServerAction({
               action: "insertLocationAction",
               duration_ms: Date.now() - t0,
               error: "",
               payload: values,
               status: "success",
               type: "db",
               user_id: null,
               id: values.location_id,
          });
          revalidatePath("/dashboard/locations");
          return { success: true, data: data?.[0] };
     } catch (e: any) {
          await logServerAction({
               action: "insertLocationAction",
               duration_ms: Date.now() - t0,
               error: e.message,
               payload: values,
               status: "fail",
               type: "db",
               user_id: null,
               id: values.id || "",
          });
          return { success: false, error: { code: "500", details: null, hint: null, message: e.message } };
     }
};

export const getAllAddedLocations = async (): Promise<{
     success: boolean;
     error?: ErrorResponse;
     data?: BuildingLocation[];
}> => {
     const supabase = await useServerSideSupabaseAnonClient();
     try {
          const { data, error } = await supabase.from(TABLES.BUILDING_LOCATIONS).select("*");
          console.log('data', data);

          if (error) {
               await logServerAction({
                    action: "getAllAddedLocations",
                    duration_ms: 0,
                    error: error.message,
                    payload: {},
                    status: "fail",
                    type: "db",
                    user_id: null,
               });
               return { success: false, error };
          }
          await logServerAction({
               action: "getAllAddedLocations",
               duration_ms: 0,
               error: "",
               payload: {},
               status: "success",
               type: "db",
               user_id: null,
          });
          return { success: true, data };
     } catch (e: any) {
          await logServerAction({
               action: "getAllAddedLocations",
               duration_ms: 0,
               error: e.message,
               payload: {},
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false, error: { code: "500", details: null, hint: null, message: e.message } };
     }
};

export const getAllAddedLocationsByClientId = async (
     client_id: string
): Promise<{ success: boolean; error?: ErrorResponse; data?: BuildingLocation[] }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const serviceSupabase = await useServerSideSupabaseServiceRoleClient();
     const { data: resolvedClientData } = await resolveClientFromClientOrMember(client_id);
     const resolvedClientId = resolvedClientData?.id!;
     if (!resolvedClientId.trim()) {
          await logServerAction({
               action: "getAllAddedLocationsByClientId",
               duration_ms: 0,
               error: "Invalid client_id",
               payload: { client_id },
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false, error: { code: "400", details: null, hint: null, message: "Invalid client_id" } };
     }
     try {
          const { data, error } = await supabase
               .from(TABLES.BUILDING_LOCATIONS)
               .select("*")
               .eq("client_id", resolvedClientId);
          if (error) {
               await logServerAction({
                    action: "getAllAddedLocationsByClientId",
                    duration_ms: 0,
                    error: error.message,
                    payload: { client_id: resolvedClientId },
                    status: "fail",
                    type: "db",
                    user_id: null,
               });
               return { success: false, error };
          }
          const enriched = await enrichLocationsWithExtras(serviceSupabase, data || []);
          await logServerAction({
               action: "getAllAddedLocationsByClientId",
               duration_ms: 0,
               error: "",
               payload: { client_id: resolvedClientId },
               status: "success",
               type: "db",
               user_id: null,
          });
          return { success: true, data: enriched };
     } catch (e: any) {
          await logServerAction({
               action: "getAllAddedLocationsByClientId",
               duration_ms: 0,
               error: e.message,
               payload: { client_id: resolvedClientId },
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false, error: { code: "500", details: null, hint: null, message: e.message } };
     }
};

export const getAllOtherClientsLocations = async (
     client_id: string
): Promise<{ success: boolean; error?: ErrorResponse; data?: BuildingLocation[] }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const serviceSupabase = await useServerSideSupabaseServiceRoleClient();
     const { data: resolvedClientData } = await resolveClientFromClientOrMember(client_id);
     const resolvedClientId = resolvedClientData?.id!;
     if (!resolvedClientId.trim()) {
          await logServerAction({
               action: "getAllOtherClientsLocations",
               duration_ms: 0,
               error: "Invalid client_id",
               payload: { client_id },
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false, error: { code: "400", details: null, hint: null, message: "Invalid client_id" } };
     }

     try {
          const { data, error } = await supabase
               .from(TABLES.BUILDING_LOCATIONS)
               .select("*")
               .neq("client_id", resolvedClientId)
               .not("building_id", "is", null);

          if (error) {
               await logServerAction({
                    action: "getAllOtherClientsLocations",
                    duration_ms: 0,
                    error: error.message,
                    payload: { client_id: resolvedClientId },
                    status: "fail",
                    type: "db",
                    user_id: null,
               });
               return { success: false, error };
          }

          const enriched = await enrichLocationsWithExtras(serviceSupabase, data || []);

          await logServerAction({
               action: "getAllOtherClientsLocations",
               duration_ms: 0,
               error: "",
               payload: { client_id: resolvedClientId },
               status: "success",
               type: "db",
               user_id: null,
          });
          return { success: true, data: enriched };
     } catch (e: any) {
          await logServerAction({
               action: "getAllOtherClientsLocations",
               duration_ms: 0,
               error: e.message,
               payload: { client_id: resolvedClientId },
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false, error: { code: "500", details: null, hint: null, message: e.message } };
     }
}

export const getAllNotOcupiedLocationsAddedByClient = async (
     client_id: string
): Promise<{ success: boolean; error?: ErrorResponse; data?: BuildingLocation[] }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const { data: resolvedClientData2 } = await resolveClientFromClientOrMember(client_id);
     const resolvedClientId = typeof resolvedClientData2 === 'string' ? resolvedClientData2 : resolvedClientData2?.id ?? client_id;
     if (!resolvedClientId.trim()) {
          await logServerAction({
               action: "getAllNotOcupiedLocationsAddedByClient",
               duration_ms: 0,
               error: "Invalid client_id",
               payload: { client_id },
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false, error: { code: "400", details: null, hint: null, message: "Invalid client_id" } };
     }
     try {
          const { data, error } = await supabase
               .from(TABLES.BUILDING_LOCATIONS)
               .select("*")
               .eq("client_id", resolvedClientId)
               .is("building_id", null);
          if (error) {
               await logServerAction({
                    action: "getAllNotOcupiedLocationsAddedByClient",
                    duration_ms: 0,
                    error: error.message,
                    payload: { client_id: resolvedClientId },
                    status: "fail",
                    type: "db",
                    user_id: null,
               });
               return { success: false, error };
          }
          await logServerAction({
               action: "getAllNotOcupiedLocationsAddedByClient",
               duration_ms: 0,
               error: "",
               payload: { client_id: resolvedClientId },
               status: "success",
               type: "db",
               user_id: null,
          });
          return { success: true, data };
     } catch (e: any) {
          await logServerAction({
               action: "getAllNotOcupiedLocationsAddedByClient",
               duration_ms: 0,
               error: e.message,
               payload: { client_id: resolvedClientId },
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false, error: { code: "500", details: null, hint: null, message: e.message } };
     }
};

export const deleteLocationByID = async (
     id: string
): Promise<{ success: boolean; error?: ErrorResponse }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     if (!id) {
          await logServerAction({
               action: "deleteLocationByID",
               duration_ms: 0,
               error: "No location ID provided",
               payload: { id },
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false, error: { code: "400", details: null, hint: null, message: "No location ID provided" } };
     }
     try {
          const { error } = await supabase.from(TABLES.BUILDING_LOCATIONS).delete().eq("id", id);
          if (error) {
               await logServerAction({
                    action: "deleteLocationByID",
                    duration_ms: 0,
                    error: error.message,
                    payload: { id },
                    status: "fail",
                    type: "db",
                    user_id: null,
               });
               return { success: false, error };
          }
          await logServerAction({
               action: "deleteLocationByID",
               duration_ms: 0,
               error: "",
               payload: { id },
               status: "success",
               type: "db",
               user_id: null,
               id,
          });
          revalidatePath("/dashboard/locations");
          return { success: true };
     } catch (e: any) {
          await logServerAction({
               action: "deleteLocationByID",
               duration_ms: 0,
               error: e.message,
               payload: { id },
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false, error: { code: "500", details: null, hint: null, message: e.message } };
     }
};

export const getAllAddedLocationsWithoutBuildingId = async (): Promise<{
     success: boolean;
     error?: ErrorResponse;
     data?: BuildingLocation[];
}> => {
     const supabase = await useServerSideSupabaseAnonClient();
     try {
          const { data, error } = await supabase
               .from(TABLES.BUILDING_LOCATIONS)
               .select("*")
               .is("building_id", null);
          if (error) {
               await logServerAction({
                    action: "getAllLocationsWithoutBuildingId",
                    duration_ms: 0,
                    error: error.message,
                    payload: {},
                    status: "fail",
                    type: "db",
                    user_id: null,
               });
               return { success: false, error };
          }
          await logServerAction({
               action: "getAllLocationsWithoutBuildingId",
               duration_ms: 0,
               error: "",
               payload: {},
               status: "success",
               type: "db",
               user_id: null,
          });
          return { success: true, data };
     } catch (e: any) {
          await logServerAction({
               action: "getAllLocationsWithoutBuildingId",
               duration_ms: 0,
               error: e.message,
               payload: {},
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false, error: { code: "500", details: null, hint: null, message: e.message } };
     }
};

