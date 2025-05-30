import React, { useContext, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Box, Typography, Card, CardContent, CardMedia } from '@mui/material';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import { useTranslation } from 'react-i18next';
import { SettingsContext } from 'src/contexts/settings/settings-context';
import { getPrimary } from 'src/theme/utils';

interface MarkerProps {
     lat: number;
     lng: number;
     full_address: string;
     // image: string;
     map: mapboxgl.Map;
}

const Marker: React.FC<MarkerProps> = React.memo(({ lat, lng, full_address, map }) => {
     console.log('full_address', full_address);

     const { t } = useTranslation();

     const markerEl = useRef<HTMLDivElement>(null);
     const markerRef = useRef<mapboxgl.Marker | null>(null);
     const popupEl = useRef<HTMLDivElement>(null);
     const { colorPreset } = useContext(SettingsContext); // Access colorPreset from the context
     const primary = getPrimary(colorPreset); // Dynamically get the primary color

     // Initialize the marker
     useEffect(() => {
          const marker = new mapboxgl.Marker({
               element: markerEl.current!,
               anchor: 'top',
               draggable: false,
          })
               .setLngLat([lng, lat])
               .addTo(map);

          markerRef.current = marker;

          return () => {
               marker.remove();
          };
     }, [map]);

     // Update marker position when `lat` or `lng` changes
     useEffect(() => {
          const marker = markerRef.current;
          if (marker) {
               marker.setLngLat([lng, lat]);
          }
     }, [lat, lng]);

     // Initialize and handle popup
     useEffect(() => {

          if (!popupEl.current) {
               return;
          }

          const popup = new mapboxgl.Popup({
               closeButton: false,
               closeOnClick: true,
               closeOnMove: true,
               anchor: 'right',
               maxWidth: '300px',
               offset: [-20, 0],
          })
               .setDOMContent(popupEl.current!)
               .on('open', () => {
                    markerEl.current?.style.setProperty('color', primary.darkest!); // Set active color
               })
               .on('close', () => {
                    markerEl.current?.style.setProperty('color', primary.main); // Reset color
               });

          const marker = markerRef.current;
          if (marker) {
               marker.setPopup(popup);
          }

          return () => {
               popup.remove();
          };
     }, []);


     return (
          <Box>
               <Box
                    ref={markerEl}
                    sx={{
                         cursor: 'pointer',
                         color: primary.main,
                         transition: 'color 0.3s ease',
                    }}
               >
                    <LocationCityIcon fontSize="large" />
               </Box>
               <Box ref={popupEl}>
                    <Card sx={{ width: 200 }}>
                         <CardMedia
                              component="img"
                              height="200"
                              image={'/assets/no-image.png'}
                              alt={full_address}
                         />
                         <CardContent>
                              <Typography gutterBottom variant="h6" component="div">
                                   {t('locations.locationPopupTitle')}:
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                   {full_address}
                              </Typography>
                         </CardContent>
                    </Card>
               </Box>
          </Box>
     );
});

export default Marker;
