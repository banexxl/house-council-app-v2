'use server';

import { logServerAction } from "src/libs/supabase/server-logging";
import { useServerSideSupabaseServiceRoleClient } from "src/libs/supabase/sb-server";
import { Building } from "src/types/building";
import { validate as isUUID } from 'uuid';

// GET all buildings
export async function getAllBuildingsFromClient(client_id: string): Promise<{ success: boolean, error?: string, data?: Building[] }> {

     const time = Date.now();
     const supabase = await useServerSideSupabaseServiceRoleClient()

     const { data, error } = await supabase
          .from('tblBuildings')
          .select('*')
          .eq('client_id', client_id);

     if (error) {
          await logServerAction({
               action: 'getAllBuildingsFromClient',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { client_id },
               status: 'fail',
               type: 'db',
               user_id: client_id,
               id: '',
          })
          return { success: false, error: error.message };
     }
     await logServerAction({
          action: 'getAllBuildingsFromClient',
          duration_ms: Date.now() - time,
          error: '',
          payload: { client_id },
          status: 'success',
          type: 'db',
          user_id: client_id,
          id: '',
     })
     return { success: true, data: data as Building[] };
}

// GET single building by ID
export async function getBuildingById(id: string): Promise<{ success: boolean, error?: string, data?: Building }> {

     const isValidUUIDv4 = isUUID(id);

     if (!isValidUUIDv4) {
          return { success: false, error: 'Invalid UUID' };
     }
     const time = Date.now();
     const supabase = await useServerSideSupabaseServiceRoleClient()


     const { data, error } = await supabase
          .from('tblBuildings')
          .select(`
               *,
               building_location:tblBuildingLocations (
                 id,
                 street_address,
                 street_number,
                 city,
                 region,
                 country,
                 post_code,
                 latitude,
                 longitude,
                 created_at,
                 updated_at
               )
             `)
          .eq('id', id)
          .single();

     if (error) {
          await logServerAction({
               action: 'getBuildingById',
               duration_ms: Date.now() - time,
               error: error.message,
               payload: { id },
               status: 'fail',
               type: 'db',
               user_id: '',
               id: '',
          })
          return { success: false, error: error.message };
     }

     await logServerAction({
          action: 'getBuildingById',
          duration_ms: Date.now() - time,
          error: '',
          payload: { id },
          status: 'success',
          type: 'db',
          user_id: '',
          id: '',
     })
     return { success: true, data: data as Building };
}

// CREATE a new building
export async function createBuilding(payload: Omit<Building, 'id'>): Promise<{ success: boolean, error?: string, data?: Building | null }> {

     const supabase = await useServerSideSupabaseServiceRoleClient()

     const { data, error } = await supabase
          .from('tblBuildings')
          .insert(payload)
          .select()
          .single();

     if (error) return { success: false, error: error.message };
     return { success: true, data: data as Building };
}

// UPDATE a building
export async function updateBuilding(id: string, updates: Partial<Omit<Building, 'id' | 'created_at' | 'updated_at'>>): Promise<{ success: boolean, error?: string, data?: Building }> {

     const supabase = await useServerSideSupabaseServiceRoleClient()

     const { data, error } = await supabase
          .from('tblBuildings')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

     if (error) return { success: false, error: error.message };
     return { success: true, data: data as Building };
}

// DELETE a building
export async function deleteBuilding(id: string): Promise<{ success: boolean, error?: string, data?: null }> {

     const supabase = await useServerSideSupabaseServiceRoleClient()

     const { error } = await supabase.from('tblBuildings').delete().eq('id', id);

     if (error) return { success: false, error: error.message };
     return { success: true, data: null };
}
