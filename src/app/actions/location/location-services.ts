"use server";

import { revalidatePath } from "next/cache";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { logServerAction } from "src/libs/supabase/server-logging";
import { BuildingLocation } from "src/types/location";
import { readClientOrClientIDFromClientMemberID } from "../client/client-members";
import { TABLES } from "src/libs/supabase/tables";

type ErrorResponse = {
     code: string;
     details: string | null;
     hint: string | null;
     message: string;
};

// Get all locations (admin use)
export const getAllLocations = async () => {
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.from(TABLES.BUILDING_LOCATIONS).select("*");
     if (error) return { success: false, error: error.message };
     return { success: true, data };
};

export const insertLocationAction = async (
     values: BuildingLocation
): Promise<{ success: boolean; error?: ErrorResponse; data?: BuildingLocation }> => {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();
     const { data: resolvedForInsert } = await readClientOrClientIDFromClientMemberID(values.client_id);
     const client_id = typeof resolvedForInsert === 'string' ? resolvedForInsert : resolvedForInsert?.id ?? values.client_id;

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
     const { data: resolvedClientData } = await readClientOrClientIDFromClientMemberID(client_id);
     const resolvedClientId = typeof resolvedClientData === 'string' ? resolvedClientData : resolvedClientData?.id ?? client_id;
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
          const enriched = (data || []).map(l => ({
               ...l,
               location_occupied: !!(l.building_id && l.building_id !== ""),
          }));
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

export const getAllNotOcupiedLocationsAddedByClient = async (
     client_id: string
): Promise<{ success: boolean; error?: ErrorResponse; data?: BuildingLocation[] }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const { data: resolvedClientData2 } = await readClientOrClientIDFromClientMemberID(client_id);
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

