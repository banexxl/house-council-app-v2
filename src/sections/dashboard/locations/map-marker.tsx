import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Box, Typography, Card, CardContent, CardMedia } from '@mui/material';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import { useTranslation } from 'react-i18next';
import { getPrimary } from 'src/theme/utils';

interface MarkerProps {
     lat: number;
     lng: number;
     address: string;
     // image: string;
     map: mapboxgl.Map;
}

const Marker: React.FC<MarkerProps> = React.memo(({ lat, lng, address, map }) => {

     const { t } = useTranslation();

     const markerEl = useRef<HTMLDivElement>(null);
     const markerRef = useRef<mapboxgl.Marker | null>(null);
     const popupEl = useRef<HTMLDivElement>(null);
     const [active, setActive] = useState(false);

     // Initialize the marker
     useEffect(() => {
          const marker = new mapboxgl.Marker({
               element: markerEl.current!,
               anchor: 'top',
               draggable: true,
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
               anchor: 'bottom',
               maxWidth: '300px',
          })
               .setDOMContent(popupEl.current!)
               .on('open', () => {
                    markerEl.current?.style.setProperty('color', getPrimary().main); // Set active color
               })
               .on('close', () => {
                    markerEl.current?.style.setProperty('color', getPrimary().darkest!); // Reset color
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
                         color: getPrimary().dark,
                         transition: 'color 0.3s ease',
                    }}
               >
                    <LocationCityIcon fontSize="large" />
               </Box>
               <Box ref={popupEl}>
                    <Card sx={{ width: 200 }}>
                         <CardMedia
                              component="img"
                              height="140"
                              image={'/assets/no-image.png'}
                              alt={address}
                         />
                         <CardContent>
                              <Typography>
                                   {t('locations.locationPopupTitle')}
                              </Typography>
                              <Typography gutterBottom variant="h6" component="div">
                                   {t('locations.locationAddress')}:
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                   {address}
                              </Typography>
                         </CardContent>
                    </Card>
               </Box>
          </Box>
     );
});

export default Marker;
