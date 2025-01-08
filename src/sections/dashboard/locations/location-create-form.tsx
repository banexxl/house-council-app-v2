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

     const { t } = useTranslation();
     const [fullAddress, setFullAddress] = useState('');
     mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY!
     const mapContainerRef = useRef();
     const mapRef = useRef<mapboxgl.Map | null>(null);

     /**
      * Asynchronously fetches the user's current location using geolocation permissions.
      * If the user grants permission, sets the selected location state with the fetched
      * coordinates and initializes a map centered at that location. If permission is denied 
      * or an error occurs, defaults to a predefined location (Belgrade) and initializes 
      * the map centered there.
      */

     const fetchLocation = async () => {
          const permission = await askForLocationPermission(t);
          if (permission?.locationPermissionGranted) {
               mapRef.current = new mapboxgl.Map({
                    container: 'map', // container ID
                    style: 'mapbox://styles/mapbox/streets-v12', // style URL
                    center: [permission!.lng, permission!.lat], // starting position [lng, lat]
                    zoom: 9, // starting zoom
               });
          } else {
               // Default to Belgrade
               mapRef.current = new mapboxgl.Map({
                    container: 'map', // container ID
                    style: 'mapbox://styles/mapbox/streets-v12', // style URL
                    center: [permission!.lng, permission!.lat], // starting position [lng, lat]
                    zoom: 9, // starting zoom
               });
          }
     };

     useEffect(() => {
          fetchLocation();
     }, []);

     const handleSave = async (values: any) => {
          if (!values) return;

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
          <Box sx={{
               display: 'flex',
               flexDirection: 'row',
          }}>

               <Box id="map" ref={mapContainerRef} sx={{
                    height: '300px',
                    width: '300px'
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
                                        disabled={!location}
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
