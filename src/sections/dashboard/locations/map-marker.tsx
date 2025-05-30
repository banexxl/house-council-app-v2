import React, { useContext, useEffect, useRef } from 'react';
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
     map: mapboxgl.Map;
}

const Marker: React.FC<MarkerProps> = React.memo(({ lat, lng, full_address, map }) => {
     const { t } = useTranslation();
     const markerEl = useRef<HTMLDivElement>(null);
     const popupEl = useRef<HTMLDivElement>(null);
     const markerRef = useRef<mapboxgl.Marker | null>(null);
     const { colorPreset } = useContext(SettingsContext);
     const primary = getPrimary(colorPreset);

     useEffect(() => {
          // Wait for markerEl to exist
          if (!markerEl.current) return;

          // Wrap creation in requestAnimationFrame to ensure DOM mount
          const frame = requestAnimationFrame(() => {
               if (!markerEl.current) return;

               const marker = new mapboxgl.Marker({
                    element: markerEl.current,
                    anchor: 'top',
                    draggable: false,
               })
                    .setLngLat([lng, lat])
                    .addTo(map);

               markerRef.current = marker;

               if (popupEl.current) {
                    const popup = new mapboxgl.Popup({
                         closeButton: false,
                         closeOnClick: true,
                         closeOnMove: true,
                         anchor: 'right',
                         maxWidth: '300px',
                         offset: [-20, 0],
                    })
                         .setDOMContent(popupEl.current)
                         .on('open', () => {
                              markerEl.current?.style.setProperty('color', primary.darkest!);
                         })
                         .on('close', () => {
                              markerEl.current?.style.setProperty('color', primary.main);
                         });

                    marker.setPopup(popup);
               }
          });

          return () => {
               cancelAnimationFrame(frame);
               markerRef.current?.remove();
          };
     }, [lat, lng, map, primary]);

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
                              image="/assets/no-image.png"
                              alt={full_address}
                         />
                         <CardContent>
                              <Typography gutterBottom variant="h6">
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
