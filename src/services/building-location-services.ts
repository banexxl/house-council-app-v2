'use server'

import { supabase } from 'src/libs/supabase/client'
import { BuildingLocation } from 'src/types/location'

export const insertLocation = async (values: BuildingLocation) => {
     try {
          const { data, error } = await supabase.from('tblBuildingLocations').insert([
               {
                    street_address: values.streetAddress,
                    city: values.city,
                    region: values.region,
                    country: values.country,
                    street_number: values.streetNumber,
                    created_at: new Date().toISOString(),
                    latitude: values.latitude,
                    longitude: values.longitude
               }
          ])

          if (error) {
               console.error('Error saving location:', error)
               return { success: false, error: error }
          } else {
               console.log('Location saved:', data)
               return { success: true, data }
          }
     } catch (error) {
          console.error('Error saving location:', error)
          return { success: false, error }
     }
}

