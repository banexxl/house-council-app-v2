'use server'

import { supabase } from 'src/libs/supabase/client'
import { BuildingLocation } from 'src/types/location'

export const insertLocation = async (values: BuildingLocation) => {

     try {
          // Check if a location with the same address, city, street number, and region already exists
          const { data: existingLocations, error: fetchError } = await supabase
               .from('tblBuildingLocations')
               .select('id')
               .eq('street_address', values.streetAddress)
               .eq('city', values.city)
               .eq('street_number', values.streetNumber)
               .eq('region', values.region);

          if (fetchError) {
               console.error('Error checking existing location:', fetchError);
               return { success: false, error: fetchError };
          }

          if (existingLocations && existingLocations.length > 0) {
               console.log('Location already exists');
               return { success: false, message: 'Location already exists with the same address, city, street number, and region.' };
          }

          const { data, error } = await supabase.from('tblBuildingLocations').insert([
               {
                    street_address: values.streetAddress,
                    city: values.city,
                    region: values.region,
                    country: values.country,
                    street_number: values.streetNumber,
                    created_at: new Date().toISOString(),
                    latitude: values.latitude,
                    longitude: values.longitude,
                    post_code: values.post_code
               }
          ]);

          if (error) {
               console.error('Error saving location:', error);
               return { success: false, error: error };
          } else {
               console.log('Location saved:', data);
               return { success: true, data };
          }
     } catch (error) {
          console.error('Error saving location:', error);
          return { success: false, error };
     }
}

export const getAllLocationsFromClient = async () => {
     try {
          const { data, error } = await supabase.from('tblBuildingLocations').select('*')
          if (error) {
               console.error('Error fetching locations:', error);
               return { success: false, error: error };
          } else {
               console.log('Locations fetched:', data);
               return { success: true, data };
          }
     } catch (error) {
          console.error('Error fetching locations:', error);
          return { success: false, error };
     }
}

