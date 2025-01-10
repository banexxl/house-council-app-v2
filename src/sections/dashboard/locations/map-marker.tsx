import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Box, Typography, Card, CardContent, CardMedia } from '@mui/material';
import LocationCityIcon from '@mui/icons-material/LocationCity';

interface MarkerProps {
     lat: number;
     lng: number;
     address: string;
     image: string;
     map: mapboxgl.Map;
}

const Marker: React.FC<MarkerProps> = ({ lat, lng, address, image, map }) => {
     const markerEl = useRef<HTMLDivElement>(null);
     const markerRef = useRef<mapboxgl.Marker | null>(null);
     const popupEl = useRef<HTMLDivElement>(null);
     const [active, setActive] = useState(false);

     // Initialize the marker
     useEffect(() => {
          const marker = new mapboxgl.Marker({
               element: markerEl.current!,
               anchor: 'bottom',
               draggable: true,
               offset: [0, 60],
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
          const marker = markerRef.current;
          if (!marker) return;

          const popup = new mapboxgl.Popup({
               closeButton: false,
               closeOnClick: true,
               closeOnMove: true,
               maxWidth: '300px',
               offset: [0, -60],
          })
               .setDOMContent(popupEl.current!)
               .on('open', () => setActive(true))
               .on('close', () => setActive(false));

          marker.setPopup(popup);

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
                         color: active ? 'primary.main' : 'info.dark',
                         transition: 'color 0.3s ease',
                    }}
               >
                    <LocationCityIcon fontSize="large" />
               </Box>
               <Box ref={popupEl}>
                    <Card sx={{ maxWidth: 300 }}>
                         <CardMedia
                              component="img"
                              height="140"
                              image={'/assets/no-image.png'}
                              alt={address}
                         />
                         <CardContent>
                              <Typography gutterBottom variant="h6" component="div">
                                   Adresa:
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                   {address}
                              </Typography>
                         </CardContent>
                    </Card>
               </Box>
          </Box>
     );
};

export default Marker;
