'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Card, Stack, TextField, Typography } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import mapboxgl from 'mapbox-gl';
import { useTranslation } from 'react-i18next';
import LocationAutocomplete from './autocomplete';
import { BuildingLocation } from 'src/types/location';
import { insertLocationAction } from 'src/app/actions/location-actions/location-services';
import { transliterateCyrillicToLatin } from 'src/utils/transliterate';
import toast from 'react-hot-toast';
import Marker from './map-marker';

import SaveIcon from '@mui/icons-material/Save';
import NotInterestedIcon from '@mui/icons-material/NotInterested';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY!;

const LocationCreateForm = () => {

     const { t } = useTranslation();
     const [location, setLocation] = useState({ lng: 20.457273, lat: 44.817619 }); // Default to Belgrade
     const mapContainerRef = useRef<HTMLDivElement>(null);
     const mapRef = useRef<mapboxgl.Map | null>(null);
     const [loading, setLoading] = useState<boolean>(false);

     const { control, handleSubmit, setValue, watch } = useForm({
          defaultValues: {
               location_id: '',
               country: '',
               region: '',
               city: '',
               postcode: 0,
               street_address: '',
               street_number: '',
               latitude: 0,
               longitude: 0,
          },
     });
     const [markerData, setMarkerData] = useState<{ lat: number; lng: number; address: string; image: string } | null>(null)

     const addressSelected = !!watch('country') && !!watch('city') && !!watch('street_address');

     useEffect(() => {
          if (mapRef.current) {
               mapRef.current.flyTo({ center: [location.lng, location.lat], zoom: 19 });
          } else {
               // This happens on page reload
               mapRef.current = new mapboxgl.Map({
                    container: mapContainerRef.current!,
                    style: 'mapbox://styles/mapbox/streets-v12',
                    center: [location.lng, location.lat],
                    zoom: 8,
               });
          }
          // return () => {
          //      mapRef.current?.remove();
          // };
     }, [location, markerData]);

     const handleSave = async (data: any) => {
          setLoading(true);
          const payload: BuildingLocation = {
               location_id: data.location_id,
               street_address: transliterateCyrillicToLatin(data.street_address),
               city: data.city,
               region: data.region,
               country: data.country,
               street_number: data.street_number,
               latitude: data.latitude,
               longitude: data.longitude,
               post_code: parseInt(data.postcode),
          };

          try {
               const { error } = await insertLocationAction(payload);

               if (!error) {
                    toast.success(t('locations.locationSaved'), { duration: 3000 });
               } else {
                    const prefix = t('locations.locationNotSaved') + ':\n';
                    error.code === '23505'
                         ? toast.error(prefix + t('errors.location.uniqueConstraint'))
                         : error.code === '23503'
                              ? toast.error(prefix + t('errors.location.foreignKeyViolation'))
                              : error.code === '23502'
                                   ? toast.error(prefix + t('errors.location.notNullViolation'))
                                   : error.code === '22P02'
                                        ? toast.error(prefix + t('errors.location.dataTypeMismatch'))
                                        : error.code === '23514'
                                             ? toast.error(prefix + t('errors.location.checkViolation'))
                                             : toast.error(prefix + t('errors.location.unexpectedError'));
               }
          } catch (err) {
               console.error(err);
               toast.error(t('locations.locationNotSaved') + ':\n' + t('errors.location.unexpectedError'), {
                    duration: 3000,
               });
          } finally {
               handleClear();
               setLoading(false);
          }
     };

     const handleClear = () => {
          setValue('country', '');
          setValue('region', '');
          setValue('city', '');
          setValue('postcode', 0);
          setValue('street_address', '');
          setValue('street_number', '');
          setValue('latitude', 0);
          setValue('longitude', 0);
     }
     const onAddressSelected = (event: any) => {
          // Extract values from the event object
          const { id, context, address, text, center } = event;

          const country = context.find((ctx: any) => ctx.id.includes('country'))?.text || '';
          const region = context.find((ctx: any) => ctx.id.includes('region'))?.text || '';
          const city = context.find((ctx: any) => ctx.id.includes('place'))?.text || '';
          const postcode = context.find((ctx: any) => ctx.id.includes('postcode'))?.text || '';
          const street_address = text || '';
          const street_number = address || '';

          // Update form values
          setValue('location_id', id);
          setValue('country', country);
          setValue('region', region);
          setValue('city', city);
          setValue('postcode', postcode);
          setValue('street_address', street_address);
          setValue('street_number', street_number);
          setValue('latitude', center[1]);
          setValue('longitude', center[0]);

          // Update map location
          if (center) {
               setLocation({ lng: center[0], lat: center[1] });
          }

          // Set marker data
          setMarkerData({
               lat: center[1],
               lng: center[0],
               address: `${street_address} ${street_number}, ${city}, ${country}`,
               image: 'https://via.placeholder.com/300x140', // Replace with actual image URL
          });
     };

     return (
          <Card
               sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    padding: '20px',
                    justifyContent: 'space-between',
                    gap: 2,
               }}
          >
               <Box
                    sx={{
                         display: 'flex',
                         flexDirection: 'column',
                         gap: 2,
                         width: '40%',
                    }}
               >
                    <Typography variant="h6">
                         {t('locations.locationsChooseAddress')}
                    </Typography>
                    <LocationAutocomplete label={t('locations.locationsChooseAddress')} onAddressSelected={onAddressSelected} />
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
                                        name="postcode"
                                        control={control}
                                        render={({ field }) => (
                                             <TextField
                                                  {...field}
                                                  label={t('locations.locationPostalCode')}
                                                  variant="outlined"
                                                  fullWidth
                                                  disabled
                                             />
                                        )}
                                   />
                                   <Controller
                                        name="street_address"
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
                                        name="street_number"
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
                              <Box sx={{ justifyContent: 'space-between', display: 'flex' }}>
                                   <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={handleClear}
                                        disabled={!addressSelected}
                                        endIcon={<NotInterestedIcon />}
                                   >
                                        {t('common.btnClear')}
                                   </Button>
                                   <Button
                                        variant="contained"
                                        color="primary"
                                        type="submit"
                                        disabled={!addressSelected}
                                        endIcon={<SaveIcon />}
                                        loading={loading}
                                        loadingPosition='end'
                                   >
                                        {t('common.btnSave')}
                                   </Button>
                              </Box>
                         </Stack>
                    </form>
               </Box>
               <Box
                    id="map"
                    ref={mapContainerRef}
                    sx={{
                         height: '600px',
                         width: '700px',
                         border: '1px solid #ccc',
                         borderRadius: '14px',
                    }}
               >
                    {mapRef.current && markerData && (
                         <Marker
                              lat={markerData.lat}
                              lng={markerData.lng}
                              address={markerData.address}
                              // image={markerData.image}
                              map={mapRef.current}
                         />
                    )}
               </Box>
          </Card>
     );
};

export default LocationCreateForm;
