import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { Formik, Form, Field } from 'formik';
// import { createClient } from '@supabase/supabase-js';
import { supabase } from 'src/libs/supabase/client';
import { askForLocationPermission } from 'src/utils/location-permission';
import { useTranslation } from 'react-i18next';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';

const LocationCreateForm = () => {

     const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lng: number } | null>(null);
     const { t } = useTranslation();
     const [fullAddress, setFullAddress] = useState('');

     const mapContainerRef = useRef();
     const mapRef = useRef<mapboxgl.Map | null>(null);


     // Set initial viewport to Belgrade
     const [viewport, setViewport] = useState({
          latitude: 44.7866,
          longitude: 20.4489,
          zoom: 12,
     });

     useEffect(() => {

          mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY!
          const fetchLocation = async () => {
               const location = await askForLocationPermission(t);
               if (location) {
                    setSelectedLocation({ ...location });
                    setViewport({
                         ...viewport,
                         latitude: location.lat,
                         longitude: location.lng,
                         zoom: 14,
                    });
               } else {
                    setSelectedLocation(null);
               }
          };
          fetchLocation();

          mapRef.current = new mapboxgl.Map({
               container: 'map', // container ID
               style: 'mapbox://styles/mapbox/streets-v12', // style URL
               center: [-74.5, 40], // starting position [lng, lat]
               zoom: 9, // starting zoom
          });


     }, [t, viewport]);

     const handleSave = async (values: any) => {
          if (!selectedLocation) return;

          // const { data, error } = await supabase.from('locations').insert([
          //      {
          //           street_address: selectedLocation.address,
          //           city: values.city,
          //           region: values.region,
          //           country: values.country,
          //           street_number: values.street_number,
          //           created_at: new Date().toISOString(),
          //      },
          // ]);

          // if (error) {
          //      console.error('Error saving location:', error.message);
          // } else {
          //      console.log('Location saved:', data);
          // }
     };

     return (
          <Box>

               <Box id="map" ref={mapContainerRef} sx={{
                    height: '300px',
                    width: 'auto'
               }}>

               </Box>
               <Formik
                    initialValues={{
                         city: '',
                         region: '',
                         country: '',
                         street_number: '',
                    }}
                    onSubmit={(values) => handleSave(values)}
               >
                    {({ handleChange, values }) => (
                         <Form>
                              <Stack spacing={4}>
                                   <Box>
                                        <Typography variant="h6">Search for a location</Typography>
                                        {/* <AddressAutofill accessToken={process.env.NEXT_PUBLIC_MAPBOX_API_KEY!}>
                                             <input
                                                  autoComplete="shipping address-line1"
                                                  value={fullAddress}
                                                  onChange={(e) => setFullAddress(e.target.value)}
                                             />
                                        </AddressAutofill> */}
                                   </Box>
                                   <Box>
                                        {/* <AddressMinimap
                                             {...viewport}
                                             style={{ width: '100%', height: 300 }}
                                             accessToken={process.env.NEXT_PUBLIC_MAPBOX_MAP_READ_WRITE_API_KEY}
                                        >
                                             {selectedLocation && (
                                                  <Marker
                                                       latitude={selectedLocation.lat}
                                                       longitude={selectedLocation.lng}
                                                  >
                                                       <Box
                                                            sx={{
                                                                 width: '10px',
                                                                 height: '10px',
                                                                 backgroundColor: 'red',
                                                                 borderRadius: '50%',
                                                            }}
                                                       />
                                                  </Marker>
                                             )}
                                        </AddressMinimap > */}
                                   </Box>
                                   <Stack spacing={2}>
                                        <Field
                                             name="city"
                                             as={TextField}
                                             label="City"
                                             variant="outlined"
                                             fullWidth
                                             onChange={handleChange}
                                             value={values.city}
                                        />
                                        <Field
                                             name="region"
                                             as={TextField}
                                             label="Region"
                                             variant="outlined"
                                             fullWidth
                                             onChange={handleChange}
                                             value={values.region}
                                        />
                                        <Field
                                             name="country"
                                             as={TextField}
                                             label="Country"
                                             variant="outlined"
                                             fullWidth
                                             onChange={handleChange}
                                             value={values.country}
                                        />
                                        <Field
                                             name="street_number"
                                             as={TextField}
                                             label="Street Number"
                                             type="number"
                                             variant="outlined"
                                             fullWidth
                                             onChange={handleChange}
                                             value={values.street_number}
                                        />
                                   </Stack>
                                   <Button
                                        variant="contained"
                                        color="primary"
                                        type="submit"
                                        disabled={!selectedLocation}
                                   >
                                        Save Location
                                   </Button>
                              </Stack>
                         </Form>
                    )}
               </Formik>
          </Box>
     );
};

export default LocationCreateForm;
