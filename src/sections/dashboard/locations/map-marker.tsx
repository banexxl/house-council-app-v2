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

interface MarkerProps {
     lat: number;
     lng: number;
     full_address: string;
     location_id: string;
     map: mapboxgl.Map;
}

const Marker: React.FC<MarkerProps> = React.memo(({ lat, lng, full_address, location_id, map }) => {

     const { t } = useTranslation();
     const markerEl = useRef<HTMLDivElement>(null);
     const popupEl = useRef<HTMLDivElement>(null);
     const markerRef = useRef<mapboxgl.Marker | null>(null);
     const { colorPreset } = useContext(SettingsContext);
     const primary = getPrimary(colorPreset);
     const [open, setOpen] = useState(false);

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
