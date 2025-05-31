'use server'

import { revalidatePath } from 'next/cache';
import { useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server'
import { logServerAction } from 'src/libs/supabase/server-logging';
import { BuildingLocation } from 'src/types/location'

type ErrorResponse = {
     code: string;
     details: string | null;
     hint: string | null;
     message: string;
}

export const insertLocationAction = async (values: BuildingLocation): Promise<{ success: boolean; error?: ErrorResponse, data?: BuildingLocation }> => {

     const startTime = Date.now();
     const supabase = await useServerSideSupabaseServiceRoleClient()

     if (!values || !values.street_address || !values.city || !values.country || !values.street_number) {
          await logServerAction({
               action: 'insertLocationAction',
               duration_ms: Date.now() - startTime,
               error: 'Invalid location data provided',
               payload: values,
               status: 'fail',
               type: 'db',
               user_id: null,
               id: values.id || '',
          })
          return { success: false, error: { code: '22P02', details: null, hint: null, message: 'Invalid location data provided' } };
     }

     try {
          // Check if a location with the same location
          const { data: existingLocation, error: fetchError } = await supabase
               .from('tblBuildingLocations')
               .select('id')
               .eq('location_id', values.location_id)

          if (fetchError) {
               await logServerAction({
                    action: 'insertLocationAction',
                    duration_ms: Date.now() - startTime,
                    error: fetchError.message,
                    payload: values,
                    status: 'fail',
                    type: 'db',
                    user_id: null,
                    id: values.id || '',
               })
               return { success: false, error: fetchError };
          }

          // location_id from mapbox is not unique, so if the searched location has the same location)id, we will check if it has the same address, city, street number
          // If an existing location is found, check if it has the same address, city, street number (this is very unlikely to happen)
          if (existingLocation && existingLocation.length > 0) {
               //Check in db if the existing location also contains the same address, city, street number
               const { data: duplicateLocation, error: duplicateError } = await supabase
                    .from('tblBuildingLocations')
                    .select('id')
                    .eq('location_id', values.location_id)
                    .eq('street_address', values.street_address)
                    .eq('city', values.city)
                    .eq('street_number', values.street_number)

               if (duplicateError) {
                    await logServerAction({
                         action: 'insertLocationAction',
                         duration_ms: Date.now() - startTime,
                         error: duplicateError.message,
                         payload: values,
                         status: 'fail',
                         type: 'db',
                         user_id: null,
                         id: values.id || '',
                    })
                    return { success: false, error: duplicateError };
               }

               if (duplicateLocation && duplicateLocation.length > 0) {
                    await logServerAction({
                         action: 'insertLocationAction',
                         duration_ms: Date.now() - startTime,
                         error: 'Location already exists',
                         payload: values,
                         status: 'fail',
                         type: 'db',
                         user_id: null,
                         id: values.id || '',
                    })
                    return { success: false, error: { code: '23505', details: null, hint: null, message: 'Location already exists' } };
               }
          }

          const { data, error } = await supabase
               .from('tblBuildingLocations')
               .insert(
                    {
                         location_id: values.location_id,
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
               )
               .select('*');

          if (error) {
               await logServerAction({
                    action: 'insertLocationAction',
                    duration_ms: Date.now() - startTime,
                    error: error.message,
                    payload: values,
                    status: 'fail',
                    type: 'db',
                    user_id: null,
                    id: values.id || '',
               })
               return { success: false, error: error };
          } else {
               await logServerAction({
                    action: 'insertLocationAction',
                    duration_ms: Date.now() - startTime,
                    error: '',
                    payload: values,
                    status: 'success',
                    type: 'db',
                    user_id: null,
                    id: values.location_id
               })
               return { success: true, data: data![0] };
          }
     } catch (error) {
          await logServerAction({
               action: 'insertLocationAction',
               duration_ms: Date.now() - startTime,
               error: (error as Error).message,
               payload: values,
               status: 'fail',
               type: 'db',
               user_id: null,
               id: values.id || '',
          })
          return { success: false, error };
     }
}

export const deleteLocationsByIDsAction = async (ids: (string | undefined)[]) => {

     const supabase = await useServerSideSupabaseServiceRoleClient()

     if (!ids) {
          await logServerAction({
               action: 'deleteLocationsByIDsAction',
               duration_ms: 0,
               error: 'No location IDs provided',
               payload: ids,
               status: 'fail',
               type: 'db',
               user_id: null,
               id: '',
          })
          return { success: false, error: 'No location IDs provided' };
     }
     if (ids.length === 0) {
          await logServerAction({
               action: 'deleteLocationsByIDsAction',
               duration_ms: 0,
               error: 'No location IDs provided',
               payload: ids,
               status: 'fail',
               type: 'db',
               user_id: null,
               id: '',
          })
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
               await logServerAction({
                    action: 'deleteLocationsByIDsAction',
                    duration_ms: 0,
                    error: error.message,
                    payload: ids,
                    status: 'fail',
                    type: 'db',
                    user_id: null,
                    id: '',
               })
               return { success: false, error: error };
          } else {
               await logServerAction({
                    action: 'deleteLocationsByIDsAction',
                    duration_ms: 0,
                    error: '',
                    payload: ids,
                    status: 'success',
                    type: 'db',
                    user_id: null,
                    id: ids.join(','),
               })
               revalidatePath('/dashboard/locations');
               return { success: true };
          }
     } catch (error) {
          await logServerAction({
               action: 'deleteLocationsByIDsAction',
               duration_ms: 0,
               error: (error as Error).message,
               payload: ids,
               status: 'fail',
               type: 'db',
               user_id: null,
               id: '',
          })
          return { success: false, error };
     }
}

export const getAllAddedLocations = async (): Promise<{ success: boolean; error?: ErrorResponse, data?: BuildingLocation[] }> => {

     const supabase = await useServerSideSupabaseServiceRoleClient()

     try {
          const { data, error } = await supabase.from('tblBuildingLocations').select('*')
          if (error) {
               await logServerAction({
                    action: 'getAllAddedLocations',
                    duration_ms: 0,
                    error: error.message,
                    payload: {},
                    status: 'fail',
                    type: 'db',
                    user_id: null,
                    id: '',
               })
               return { success: false, error: error };
          } else {
               await logServerAction({
                    action: 'getAllAddedLocations',
                    duration_ms: 0,
                    error: '',
                    payload: {},
                    status: 'success',
                    type: 'db',
                    user_id: null,
                    id: '',
               })
               return { success: true, data };
          }
     } catch (error) {
          await logServerAction({
               action: 'getAllAddedLocations',
               duration_ms: 0,
               error: (error as Error).message,
               payload: {},
               status: 'fail',
               type: 'db',
               user_id: null,
               id: '',
          })
          return { success: false, error };
     }
}

export const deleteLocationByID = async (id: string | undefined): Promise<{ success: boolean; error?: ErrorResponse }> => {

     const supabase = await useServerSideSupabaseServiceRoleClient()

     if (!id) {
          await logServerAction({
               action: 'deleteLocationByID',
               duration_ms: 0,
               error: 'No location ID provided',
               payload: { id },
               status: 'fail',
               type: 'db',
               user_id: null,
               id: '',
          })
          return { success: false, error: { code: '400', details: null, hint: null, message: 'No location ID provided' } };
     }
     try {
          const { error } = await supabase.from('tblBuildingLocations').delete().eq('location_id', id);

          if (error) {
               await logServerAction({
                    action: 'deleteLocationByID',
                    duration_ms: 0,
                    error: error.message,
                    payload: { id },
                    status: 'fail',
                    type: 'db',
                    user_id: null,
                    id: '',
               })
               return { success: false, error: error };
          } else {
               await logServerAction({
                    action: 'deleteLocationByID',
                    duration_ms: 0,
                    error: '',
                    payload: { id },
                    status: 'success',
                    type: 'db',
                    user_id: null,
                    id: id,
               })
               return { success: true };
          }
     } catch (error) {
          await logServerAction({
               action: 'deleteLocationByID',
               duration_ms: 0,
               error: (error as Error).message,
               payload: { id },
               status: 'fail',
               type: 'db',
               user_id: null,
               id: '',
          })
          return { success: false, error };
     }
}

