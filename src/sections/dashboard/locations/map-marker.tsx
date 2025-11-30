import React, { useContext, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Box, Typography, Card, CardContent, CardMedia, Stack, Button } from '@mui/material';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { SettingsContext } from 'src/contexts/settings/settings-context';
import { getPrimary } from 'src/theme/utils';
import { deleteLocationByID } from 'src/app/actions/location/location-services';
import { PopupModal } from 'src/components/modal-dialog';
import toast from 'react-hot-toast';
import { useSignedUrl } from 'src/hooks/use-signed-urls';
import { v4 as uuidv4 } from 'uuid';

interface MarkerProps {
     lat: number;
     lng: number;
     full_address: string;
     location_id: string;
     map: mapboxgl.Map;
     client_id: string;
     client_name?: string;
     cover_bucket?: string;
     cover_path?: string;
}

const hashStringToColor = (client_id: string) => {
     const firstPart = client_id.split('-')[0];
     // Remove the last 2 characters
     const trimmed = firstPart.slice(0, -2);
     // Use the trimmed string to generate a hash
     let hash = 0;
     for (let i = 0; i < trimmed.length; i++) {
          hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
     }
     // Convert the hash to a color
     let color = '#';
     for (let i = 0; i < 3; i++) {
          const value = (hash >> (i * 8)) & 0xff;
          color += value.toString(16).padStart(2, '0');
     }
     return color;
};

const Marker: React.FC<MarkerProps> = React.memo(({ lat, lng, full_address, location_id, map, client_id, client_name, cover_bucket, cover_path }) => {

     const { t } = useTranslation();
     const markerEl = useRef<HTMLDivElement>(null);
     const popupEl = useRef<HTMLDivElement>(null);
     const markerRef = useRef<mapboxgl.Marker | null>(null);
     const { colorPreset } = useContext(SettingsContext);
     const [open, setOpen] = useState(false);
     const primary = getPrimary(colorPreset);
     const customColor = hashStringToColor(client_id) || primary.main;
     const { url: signedCoverUrl } = useSignedUrl(
          cover_bucket && cover_path ? cover_bucket : '',
          cover_bucket && cover_path ? cover_path : '',
          { ttlSeconds: 60 * 15, refreshSkewSeconds: 30 }
     );
     const coverSrc = signedCoverUrl || "/assets/no-image.png";

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
                              markerEl.current?.style.setProperty('color', customColor);
                         })
                         .on('close', () => {
                              markerEl.current?.style.setProperty('color', customColor);
                         });

                    marker.setPopup(popup);
               }
          });

          return () => {
               cancelAnimationFrame(frame);
               markerRef.current?.remove();
          };
     }, [lat, lng, map, customColor]);

     const handleDeleteConfrmation = async () => {
          const { success, error } = await deleteLocationByID(location_id)
          if (success) {
               toast.success(t('locations.locationDeletedSuccessfully'));
               markerRef.current?.remove();
               setOpen(false);
          }
          if (error) {
               toast.error(t('locations.locationNotDeleted'));
          }
     }

     return (
          <Box>
               <Box
                    ref={markerEl}
                    sx={{
                         cursor: 'pointer',
                         color: customColor,
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
                              image={coverSrc}
                              alt={full_address}
                              sx={{ objectFit: 'cover' }}
                         />
                         <CardContent>
                              <Typography gutterBottom variant="h6">
                                   {client_name || t('locations.locationPopupTitle')}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                   {full_address}
                              </Typography>
                              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                   <Button
                                        startIcon={<DeleteIcon />}
                                        variant="outlined"
                                        color="error"
                                        onClick={() => setOpen(true)}
                                   >
                                        {t('common.btnDelete')}
                                   </Button>
                              </Stack>
                         </CardContent>
                    </Card>
               </Box>
               <PopupModal
                    isOpen={open}
                    onClose={() => setOpen(false)}
                    onConfirm={() => handleDeleteConfrmation()}
                    title={t('locations.locationDeleteConfirmation')}
                    type={'confirmation'}
               />
          </Box>
     );
});

export default Marker;
