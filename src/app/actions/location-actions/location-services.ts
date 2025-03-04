'use server'

import { supabase } from 'src/libs/supabase/client'
import { BuildingLocation } from 'src/types/location'

export const insertLocationAction = async (values: BuildingLocation) => {

     try {
          // Check if a location with the same address, city, street number, and region already exists
          const { data: existingLocations, error: fetchError } = await supabase
               .from('tblBuildingLocations')
               .select('id')
               .eq('street_address', values.street_address)
               .eq('city', values.city)
               .eq('street_number', values.street_number)
               .eq('region', values.region);

          if (fetchError) {
               console.error('Error checking existing location:', fetchError);
               return { success: false, error: fetchError };
          }

          if (existingLocations && existingLocations.length > 0) {
               return { success: false, message: 'Location already exists with the same address, city, street number, and region.' };
          }

          const { data, error } = await supabase.from('tblBuildingLocations').insert([
               {
                    street_address: values.street_address,
                    city: values.city,
                    region: values.region,
                    country: values.country,
                    street_number: values.street_number,
                    created_at: new Date().toISOString(),
                    latitude: values.latitude,
                    longitude: values.longitude,
                    post_code: values.post_code
               }
          ]);

          if (error) {
               return { success: false, error: error };
          } else {
               return { success: true, data };
          }
     } catch (error) {
          console.error('Error saving location:', error);
          return { success: false, error };
     }
}

export const deleteLocationsByIDsAction = async (ids: (string | undefined)[]) => {
     if (!ids) {
          return { success: false, error: 'No location IDs provided' };
     }
     if (ids.length === 0) {
          return { success: false, error: 'No location IDs provided' };
     }
     ids.forEach((id) => {
          if (!id) {
               return { success: false, error: 'Invalid location ID' };
          }
     })
     try {
          const { error } = await supabase.from('tblBuildingLocations').delete().in('id', ids);
          if (error) {
               return { success: false, error: error };
          } else {
               return { success: true };
          }
     } catch (error) {
          console.error('Error deleting locations:', error);
          return { success: false, error };
     }
}

export const getAllLocationsFromClient = async () => {
     try {
          const { data, error } = await supabase.from('tblBuildingLocations').select('*')
          if (error) {
               return { success: false, error: error };
          } else {
               return { success: true, data };
          }
     } catch (error) {
          console.error('Error fetching locations:', error);
          return { success: false, error };
     }
}

