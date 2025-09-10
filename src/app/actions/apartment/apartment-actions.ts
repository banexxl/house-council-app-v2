'use server';

import { revalidatePath } from "next/cache";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { logServerAction } from "src/libs/supabase/server-logging";
import { Apartment } from "src/types/apartment";
import { validate as isUUID } from "uuid";

export async function getAllApartments(): Promise<{ success: boolean; error?: string; data?: Apartment[] }> {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase.from("tblApartments").select("*");

     if (error) {
          await logServerAction({
               action: "getAllApartments",
               duration_ms: Date.now() - time,
               error: error.message,
               payload: {},
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          action: "getAllapartments",
          duration_ms: Date.now() - time,
          error: "",
          payload: {},
          status: "success",
          type: "db",
          user_id: null,
     });

     return { success: true, data };
}

export async function getAllApartmentsFromClientsBuildings(clientid: string) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const [{ data: buildings, error: buildingsError }, { data: imageRecords }] = await Promise.all([
          supabase.from("tblBuildings").select("*").eq("client_id", clientid),
          supabase.from("tblApartmentImages").select("apartment_id, image_url"),
     ]);

     if (buildingsError) {
          await logServerAction({
               action: "getAllApartmentsFromClientsBuildings",
               duration_ms: Date.now() - time,
               error: buildingsError.message,
               payload: { clientid },
               status: "fail",
               type: "db",
               user_id: clientid,
               id: "",
          });
          return { success: false, error: buildingsError.message };
     }

     const [{ data: apartments, error: apartmentsError }] = await Promise.all([
          supabase.from("tblApartments").select("*").in("building_id", buildings.map(b => b.id)),
     ]);

     if (apartmentsError) {
          await logServerAction({
               action: "getAllApartmentsFromClientsBuildings",
               duration_ms: Date.now() - time,
               error: apartmentsError.message,
               payload: { clientid },
               status: "fail",
               type: "db",
               user_id: clientid,
               id: "",
          });
          return { success: false, error: apartmentsError.message };
     }

     await logServerAction({
          action: "getAllApartmentsFromClientsBuildings",
          duration_ms: Date.now() - time,
          error: "",
          payload: { clientid },
          status: "success",
          type: "db",
          user_id: clientid,
          id: "",
     });

     return { success: true, data: { apartments: apartments ?? [], building_images: imageRecords ?? [] } };
}

export async function getApartmentsFromClientsBuilding(clientid: string, buildingid: string): Promise<{ success: boolean; error?: string; data?: Apartment[] }> {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase.from("tblApartments").select("*").eq("building_id", buildingid);

     if (error) {
          await logServerAction({
               action: "getApartmentsFromClientsBuilding",
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { clientid, buildingid },
               status: "fail",
               type: "db",
               user_id: clientid,
               id: buildingid,
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          action: "getApartmentsFromClientsBuilding",
          duration_ms: Date.now() - time,
          error: "",
          payload: { clientid, buildingid },
          status: "success",
          type: "db",
          user_id: clientid,
          id: buildingid,
     });

     return { success: true, data };
}

export async function getApartmentById(id: string): Promise<{ success: boolean; error?: string; data?: Apartment }> {
     const time = Date.now();
     if (!isUUID(id)) return { success: false, error: "Invalid UUID" };
     const supabase = await useServerSideSupabaseAnonClient();

     const [{ data: apartment, error }, { data: imageRecords }] = await Promise.all([
          supabase.from("tblApartments").select("*").eq("id", id).single(),
          supabase.from("tblApartmentImages").select("image_url").eq("apartment_id", id),
     ]);

     if (error) {
          await logServerAction({
               action: "getApartmentById",
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id },
               status: "fail",
               type: "db",
               user_id: null,
               id: "",
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          action: "getApartmentById",
          duration_ms: Date.now() - time,
          error: "",
          payload: { id },
          status: "success",
          type: "db",
          user_id: null,
          id: "",
     });

     return {
          success: true,
          data: {
               ...apartment,
               apartment_images: imageRecords?.map((img) => img.image_url) ?? [],
          },
     };
}

export async function createOrUpdateApartment(payload: Apartment) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { apartment_images, id, ...apartmentPayload } = payload;

     if (id) {
          // === UPDATE ===
          delete apartmentPayload.created_at;
          delete apartmentPayload.updated_at;
     } else {
          // === CREATE ===
          apartmentPayload.created_at = new Date();
          apartmentPayload.updated_at = new Date();
     }

     if (id) {
          // === UPDATE ===
          const { data, error } = await supabase
               .from("tblApartments")
               .update(apartmentPayload)
               .eq("id", id)
               .select()
               .single();

          if (error) {
               await logServerAction({
                    action: "updateApartment",
                    duration_ms: Date.now() - time,
                    error: error.message,
                    payload,
                    status: "fail",
                    type: "db",
                    user_id: null,
               });
               return { success: false, error: error.message };
          }

          if (apartment_images) {
               await supabase.from("tblApartmentImages").delete().eq("apartment_id", id);
               const newImages = apartment_images.map((url) => ({ apartment_id: id, image_url: url }));
               await supabase.from("tblApartmentImages").insert(newImages);
          }

          await logServerAction({
               action: "updateApartment",
               duration_ms: Date.now() - time,
               error: "",
               payload,
               status: "success",
               type: "db",
               user_id: null,
          });

          return { success: true, data };
     } else {
          // === CREATE ===

          // 1. Fetch building data to get number_of_apartments limit
          const { data: building, error: buildingError } = await supabase
               .from("tblBuildings")
               .select("number_of_apartments")
               .eq("id", payload.building_id)
               .single();

          if (buildingError) {
               await logServerAction({
                    action: "createApartment",
                    duration_ms: Date.now() - time,
                    error: buildingError.message,
                    payload,
                    status: "fail",
                    type: "db",
                    user_id: null,
                    id: "",
               });
               return { success: false, error: "Failed to fetch building data." };
          }

          const maxApartments = building?.number_of_apartments ?? 0;

          // 2. Count current apartments linked to this building
          const { count, error: countError } = await supabase
               .from("tblApartments")
               .select("id", { count: "exact", head: true })
               .eq("building_id", payload.building_id);

          if (countError) {
               await logServerAction({
                    action: "createApartment",
                    duration_ms: Date.now() - time,
                    error: countError.message,
                    payload,
                    status: "fail",
                    type: "db",
                    user_id: null,
                    id: "",
               });
               return { success: false, error: "Failed to count apartments for building." };
          }

          if (count! >= maxApartments) {
               return {
                    success: false,
                    error: "Maximum number of apartments for this building has been reached.",
               };
          }

          // 3. Insert new apartment
          const { data, error } = await supabase
               .from("tblApartments")
               .insert(apartmentPayload)
               .select()
               .single();

          if (error) {
               await logServerAction({
                    action: "createApartment",
                    duration_ms: Date.now() - time,
                    error: error.message,
                    payload,
                    status: "fail",
                    type: "db",
                    user_id: null,
                    id: "",
               });
               return { success: false, error: error.message };
          }

          // 4. Insert images if provided
          if (apartment_images && apartment_images.length > 0) {
               const imageInserts = apartment_images.map((url) => ({
                    apartment_id: data.id,
                    image_url: url,
               }));
               await supabase.from("tblApartmentImages").insert(imageInserts);
          }

          await logServerAction({
               action: "createApartment",
               duration_ms: Date.now() - time,
               error: "",
               payload,
               status: "success",
               type: "db",
               user_id: null,
               id: "",
          });

          return { success: true, data };
     }
}

export async function deleteApartment(id: string) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     await supabase.from("tblApartmentImages").delete().eq("apartment_id", id);

     const { error } = await supabase.from("tblApartments").delete().eq("id", id);
     if (error) {
          await logServerAction({
               action: "deleteApartment",
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id },
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          action: "deleteApartment",
          duration_ms: Date.now() - time,
          error: "",
          payload: { id },
          status: "success",
          type: "db",
          user_id: null,
     });
     revalidatePath('/dashboard/apartments');
     return { success: true, data: null };
}

export async function checkIfApartmentExistsInBuilding(buildingId: string, apartmentNumber: string): Promise<{ exists: boolean, apartmentid?: string }> {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     if (!buildingId || !apartmentNumber) {
          return { exists: false };
     }

     const { data, error } = await supabase
          .from("tblApartments")
          .select("id")
          .eq("building_id", buildingId)
          .eq("apartment_number", apartmentNumber)
          .limit(1);

     if (error) {
          await logServerAction({
               action: "checkIfApartmentExistsInBuilding",
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { buildingId, apartmentNumber },
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { exists: false };
     }
     return {
          exists: !!data?.length,
          apartmentid: data?.[0]?.id
     };
}

