'use server';

import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { logServerAction } from "src/libs/supabase/server-logging";
import { Apartment } from "src/types/apartment";
import { validate as isUUID } from "uuid";

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
     console.log('data', apartments);

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
               user_id: "",
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
          user_id: "",
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

export async function createOrUpdateApartment(payload: Omit<Apartment, "id"> & { id?: string }) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { apartment_images, id, ...apartmentPayload } = payload;

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
                    user_id: "",
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
               user_id: "",
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
                    user_id: "",
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
                    user_id: "",
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
                    user_id: "",
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
               user_id: "",
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
               user_id: "",
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
          user_id: "",
     });

     return { success: true, data: null };
}

export async function checkIfApartmentExistsInBuilding(buildingId: string, apartmentNumber: string): Promise<{ exists: boolean, apartmentid?: string }> {
     const time = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

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
               user_id: "",
          });
          return { exists: false };
     }
     return {
          exists: !!data?.length,
          apartmentid: data?.[0]?.id
     };
}

