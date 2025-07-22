'use client';

import React, { useEffect, useState } from 'react';
import { Box, Button, Card, Stack, TextField, Theme, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import LocationAutocomplete from './autocomplete';
import { BuildingLocation } from 'src/types/location';
import { insertLocationAction } from 'src/app/actions/location/location-services';
import { transliterateCyrillicToLatin } from 'src/utils/transliterate';
import toast from 'react-hot-toast';
import SaveIcon from '@mui/icons-material/Save';
import NotInterestedIcon from '@mui/icons-material/NotInterested';
import { MapComponent } from './map-box';
import { UserDataCombined } from 'src/libs/supabase/server-auth';

type LocationCreateFormProps = {
     mapBoxAccessToken?: string;
     locationsData: BuildingLocation[] | [];
     clientCoords?: { latitude: number; longitude: number } | null;
     isGeolocationEnabled?: boolean;
     userData?: UserDataCombined
}

const LocationCreateForm = ({ mapBoxAccessToken, locationsData, clientCoords, userData }: LocationCreateFormProps) => {

     const { t } = useTranslation();
     const [location, setLocation] = useState({ latitude: clientCoords?.latitude, longitude: clientCoords?.longitude }); // Default to Belgrade
     const [markerData, setMarkerData] = useState<BuildingLocation[]>(locationsData);
     const [mapRefreshKey, setMapRefreshKey] = useState(0);
     const theme = useTheme();
     const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));

     useEffect(() => {
          if (locationsData.length > 0) {
               setMarkerData(locationsData);
          }
     }, [locationsData]);

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

     const addressSelected = !!watch('country') && !!watch('city') && !!watch('street_address');

     const handleSave = async (data: any) => {
          setLoading(true);
          const payload: BuildingLocation = {
               id: data.location_id || '',
               location_id: data.location_id,
               street_address: transliterateCyrillicToLatin(data.street_address),
               city: data.city,
               region: data.region,
               country: data.country,
               street_number: data.street_number,
               latitude: data.latitude,
               longitude: data.longitude,
               post_code: parseInt(data.postcode),
               client_id: userData?.client?.id!,
               building_id: null,
               location_occupied: false
          };

          try {
               const { error } = await insertLocationAction(payload);

               if (!error) {
                    setMarkerData((prev) => [
                         ...prev,
                         {
                              ...payload,
                              id: data.location_id,
                         },
                    ]);
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
               toast.error(t('locations.locationNotSaved') + ':\n' + t('errors.location.unexpectedError'), {
                    duration: 3000,
               });
          } finally {
               handleClear();
               setLoading(false);
          }
          setMapRefreshKey(prev => prev + 1);
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
               setLocation({ longitude: center[0], latitude: center[1] });
          }

          setMarkerData((prev) => [
               ...prev,
               {
                    id: id,
                    location_id: id,
                    latitude: center[1],
                    longitude: center[0],
                    street_address: street_address,
                    street_number: street_number,
                    country: country,
                    city: city,
                    region: region,
                    post_code: postcode,
                    client_id: userData?.client?.id!,
                    building_id: null,
                    location_occupied: false
               },
          ]);
          setMapRefreshKey(prev => prev + 1);
     };

     const handleMapClick = async (coords: { latitude: number; longitude: number }) => {
          const { latitude, longitude } = coords;

          try {
               const res = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapBoxAccessToken}`
               );

               if (!res.ok) throw new Error('Failed to reverse geocode');
               const data = await res.json();
               const feature = data.features?.[0];
               if (!feature) {
                    toast.error(t('locations.invalidAddressFormat'));
                    return;
               }

               // Find components
               const context = feature.context || [];
               const getByType = (type: string) =>
                    context.find((c: any) => c.id.startsWith(type))?.text || '';

               const country = getByType('country');
               const region = getByType('region');
               const postcode = getByType('postcode');
               const city = getByType('place') || getByType('locality');

               const address = feature.address || '';
               const street = feature.text || '';

               const street_address = street;
               const street_number = address;

               setLocation(coords);

               setValue('location_id', feature.id);
               setValue('latitude', latitude);
               setValue('longitude', longitude);
               setValue('street_address', street_address);
               setValue('street_number', street_number);
               setValue('country', country);
               setValue('region', region);
               setValue('city', city);
               setValue('postcode', postcode ? parseInt(postcode) : 0);

               toast.success(`${t('locations.locationSelected')}: ${feature.place_name}`);
          } catch (err) {
               toast.error(t('locations.locationNotFound'));
          }
     };



     return (
          <Card
               sx={{
                    display: 'flex',
                    flexDirection: mdUp ? 'row' : 'column',
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
                         width: theme.breakpoints.down('md') ? '100%' : '40%',
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
               <MapComponent
                    mapBoxAccessToken={mapBoxAccessToken}
                    center={
                         location && typeof location.longitude === 'number' && typeof location.latitude === 'number'
                              ? { longitude: location.longitude, latitude: location.latitude }
                              : { longitude: 19.044443, latitude: 47.502994 }
                    }
                    markers={markerData}
                    zoom={17}
                    refreshKey={mapRefreshKey}
                    onMapClick={handleMapClick}
               />
          </Card>
     );
};

export default LocationCreateForm;
