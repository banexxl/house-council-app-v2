'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Card, Stack, TextField, Typography } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import mapboxgl from 'mapbox-gl';
import { useTranslation } from 'react-i18next';
import Autocomplete from './autocomplete';
import { BuildingLocation } from 'src/types/location';
import { insertLocation } from 'src/services/building-location-services';
import { transliterate } from 'src/utils/transliterate';
import toast from 'react-hot-toast';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY!;

const LocationCreateForm = () => {
     const { t } = useTranslation();
     const [location, setLocation] = useState({ lng: 20.457273, lat: 44.817619 }); // Default to Belgrade
     const mapContainerRef = useRef<HTMLDivElement>(null);
     const mapRef = useRef<mapboxgl.Map | null>(null);
     const { control, handleSubmit, setValue, watch } = useForm({
          defaultValues: {
               country: '',
               region: '',
               city: '',
               zip: '',
               streetAddress: '',
               streetNumber: '',
               latitude: 0,
               longitude: 0,
          },
     });

     const addressSelected = !!watch('country') && !!watch('city');

     useEffect(() => {
          if (mapRef.current) {
               mapRef.current.flyTo({ center: [location.lng, location.lat], zoom: 9 });
          } else {
               mapRef.current = new mapboxgl.Map({
                    container: mapContainerRef.current!,
                    style: 'mapbox://styles/mapbox/streets-v12',
                    center: [location.lng, location.lat],
                    zoom: 9,
               });
          }
          // return () => {
          //      mapRef.current?.remove();
          // };
     }, [location]);

     const handleSave = async (data: any) => {

          const payload: BuildingLocation = {
               streetAddress: transliterate(data.streetAddress),
               city: data.city,
               region: data.region,
               country: data.country,
               streetNumber: data.streetNumber,
               latitude: data.latitude,
               longitude: data.longitude,
          };

          try {
               const response = await insertLocation(payload);
               if (response.success) {
                    toast.success('Location saved successfully', {
                         duration: 3000,
                         position: 'top-center',
                    })
               } else {
                    toast.error('An error occurred while saving the location', {
                         duration: 3000,
                         position: 'top-center',
                    })
               }
          } catch (error) {
               toast.error('An error occurred while saving the location', {
                    duration: 3000,
                    position: 'top-center',
               })
          }
     };

     const onAddressSelected = (event: any) => {
          // Extract values from the event object
          const { context, address, text, center } = event;

          const country = context.find((ctx: any) => ctx.id.includes('country'))?.text || '';
          const region = context.find((ctx: any) => ctx.id.includes('region'))?.text || '';
          const city = context.find((ctx: any) => ctx.id.includes('place'))?.text || '';
          const zip = context.find((ctx: any) => ctx.id.includes('postcode'))?.text || '';
          const streetAddress = text || '';
          const streetNumber = address || '';

          // Update form values
          setValue('country', country);
          setValue('region', region);
          setValue('city', city);
          setValue('zip', zip);
          setValue('streetAddress', streetAddress);
          setValue('streetNumber', streetNumber);
          setValue('latitude', center[1]);
          setValue('longitude', center[0]);

          // Update map location
          if (center) {
               setLocation({ lng: center[0], lat: center[1] });
          }
     };

     return (
          <Card
               sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    padding: '20px',
                    justifyContent: 'space-between',
               }}
          >
               <Box
                    sx={{
                         display: 'flex',
                         flexDirection: 'column',
                         gap: 2,
                    }}
               >
                    <Typography variant="h6">
                         {t('locations.locationsChooseAddress')}
                    </Typography>
                    <Autocomplete onAddressSelected={onAddressSelected} />
                    <form onSubmit={handleSubmit(handleSave)} style={{ width: '100%' }}>
                         <Stack spacing={3}>
                              <Typography variant="h6">
                                   {t('locations.locationChosenAddress')}
                              </Typography>
                              <Stack spacing={2}>
                                   <Controller
                                        name="country"
                                        control={control}
                                        render={({ field }) => (
                                             <TextField
                                                  {...field}
                                                  label={t('locations.locationCountry')}
                                                  variant="outlined"
                                                  fullWidth
                                                  disabled
                                             />
                                        )}
                                   />
                                   <Controller
                                        name="region"
                                        control={control}
                                        render={({ field }) => (
                                             <TextField
                                                  {...field}
                                                  label={t('locations.locationState')}
                                                  variant="outlined"
                                                  fullWidth
                                                  disabled
                                             />
                                        )}
                                   />
                                   <Controller
                                        name="city"
                                        control={control}
                                        render={({ field }) => (
                                             <TextField
                                                  {...field}
                                                  label={t('locations.locationCity')}
                                                  variant="outlined"
                                                  fullWidth
                                                  disabled
                                             />
                                        )}
                                   />
                                   <Controller
                                        name="zip"
                                        control={control}
                                        render={({ field }) => (
                                             <TextField
                                                  {...field}
                                                  label={t('locations.locationZipCode')}
                                                  variant="outlined"
                                                  fullWidth
                                                  disabled
                                             />
                                        )}
                                   />
                                   <Controller
                                        name="streetAddress"
                                        control={control}
                                        render={({ field }) => (
                                             <TextField
                                                  {...field}
                                                  label={t('locations.locationStreet')}
                                                  variant="outlined"
                                                  fullWidth
                                                  disabled
                                             />
                                        )}
                                   />
                                   <Controller
                                        name="streetNumber"
                                        control={control}
                                        render={({ field }) => (
                                             <TextField
                                                  {...field}
                                                  label={t('locations.locationStreetNumber')}
                                                  variant="outlined"
                                                  fullWidth
                                                  disabled
                                             />
                                        )}
                                   />
                              </Stack>
                              <Button
                                   variant="contained"
                                   color="primary"
                                   type="submit"
                                   disabled={!addressSelected}
                              >
                                   {t('locations.locationSaveButton')}
                              </Button>
                         </Stack>
                    </form>
               </Box>
               <Box
                    id="map"
                    ref={mapContainerRef}
                    sx={{
                         height: '400px',
                         width: '700px',
                         border: '1px solid #ccc',
                         borderRadius: '14px',
                    }}
               />
          </Card>
     );
};

export default LocationCreateForm;
