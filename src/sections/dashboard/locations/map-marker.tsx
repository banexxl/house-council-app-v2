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

const colorPalette = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

const hashStringToColor = (value: string | null | undefined) => {
     if (!value) return null;
     let hash = 0;
     for (let i = 0; i < value.length; i++) {
          hash = value.charCodeAt(i) + ((hash << 5) - hash);
     }
     const idx = Math.abs(hash) % colorPalette.length;
     return colorPalette[idx];
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
