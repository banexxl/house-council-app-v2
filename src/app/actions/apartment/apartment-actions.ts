'use server';

import { useServerSideSupabaseServiceRoleClient } from "src/libs/supabase/sb-server";
import { logServerAction } from "src/libs/supabase/server-logging";
import { Apartment } from "src/types/apartment";
import { validate as isUUID } from "uuid";

const enrichApartmentsWithImages = (
     apartments: Apartment[],
     imageRecords: {
          apartment_id: string;
          image_url: string;
          is_cover_image: boolean;
     }[]
): Apartment[] => {
     const imageMap = new Map<string, { image_url: string; is_cover_image: boolean }[]>();

     imageRecords.forEach((record) => {
          if (!imageMap.has(record.apartment_id)) {
               imageMap.set(record.apartment_id, []);
          }
          const images = imageMap.get(record.apartment_id)!;

          if (record.is_cover_image) {
               images.unshift({ image_url: record.image_url, is_cover_image: true });
          } else {
               images.push({ image_url: record.image_url, is_cover_image: false });
          }
     });

     return apartments.map((a) => ({
          ...a,
          apartment_images: imageMap.get(a.id!) ?? [],
     }));
};

export async function getAllApartmentsFromClientsBuildings(clientid: string) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseServiceRoleClient();

     const [{ data: buildings, error: buildingsError }, { data: imageRecords }] = await Promise.all([
          supabase.from("tblBuildings").select("*").eq("client_id", clientid),
          supabase.from("tblApartmentImages").select("apartment_id, image_url, is_cover_image"),
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

     const buildingIds = buildings ?? [];

     const [{ data: apartments, error: apartmentsError }] = await Promise.all([
          supabase.from("tblApartments").select("*").in("building_id", buildingIds.map(b => b.id)),
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

     const enriched = enrichApartmentsWithImages(apartments ?? [], imageRecords ?? []);

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

     return { success: true, data: enriched };
}

export async function getApartmentById(id: string) {
     const time = Date.now();
     if (!isUUID(id)) return { success: false, error: "Invalid UUID" };
     const supabase = await useServerSideSupabaseServiceRoleClient();

     const [{ data: apartment, error }, { data: imageRecords }] = await Promise.all([
          supabase.from("tblApartments").select("*").eq("id", id).single(),
          supabase.from("tblApartmentImages").select("apartment_id, image_url, is_cover_image").eq("apartment_id", id),
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
               apartment_images: imageRecords ?? [],
          },
     };
}

export async function createApartment(payload: Omit<Apartment, "id">) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseServiceRoleClient();

     const { apartment_images, ...insertPayload } = payload;

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
          .insert(insertPayload)
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
     if (apartment_images?.length) {
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

export async function updateApartment(id: string, updates: Partial<Apartment>) {

     const time = Date.now();
     const supabase = await useServerSideSupabaseServiceRoleClient();

     const { apartment_images, ...updatePayload } = updates;

     const { data, error } = await supabase
          .from("tblApartments")
          .update(updatePayload)
          .eq("id", id)
          .select()
          .single();

     if (error) {
          await logServerAction({
               action: "updateApartment",
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id, updates },
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
          payload: { id, updates },
          status: "success",
          type: "db",
          user_id: "",
     });

     return { success: true, data };
}

export async function deleteApartment(id: string) {
     const time = Date.now();
     const supabase = await useServerSideSupabaseServiceRoleClient();

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
