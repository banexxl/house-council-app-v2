'use client';

import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { useGeolocated } from 'react-geolocated';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { getAllAddedLocationsByClientId } from 'src/app/actions/location/location-services';
import { BreadcrumbsSeparator } from 'src/components/breadcrumbs-separator';
import { RouterLink } from 'src/components/router-link';
import { UserSessionCombined } from 'src/hooks/use-auth';
import { paths } from 'src/paths';
import LocationCreateForm from 'src/sections/dashboard/locations/location-create-form';
import { BuildingLocation } from 'src/types/location';

type NewLoctionProps = {
     mapBoxAccessToken?: string;
     userSession?: UserSessionCombined;
}

const NewLocation = ({ mapBoxAccessToken, userSession }: NewLoctionProps) => {

     const { t } = useTranslation();
     const [locationsData, setLocationsData] = useState<BuildingLocation[]>([]);
     const [clientCoords, setClientCoords] = useState<{ latitude: number; longitude: number } | null>(null);

     const { coords, isGeolocationEnabled } = useGeolocated({
          positionOptions: {
               enableHighAccuracy: false,
          },
          userDecisionTimeout: 5000,
          onSuccess: (position) => {
               if (position.coords) {
                    toast.success(t('locations.geoLocationAvailable'));
                    setClientCoords({
                         latitude: position.coords.latitude || 47.502994,
                         longitude: position.coords.longitude || 19.044443,
                    });
               }
          },
          onError: () => {
               toast.error(t('locations.geoLocationNotAvailable'));
          },
     });

     useEffect(() => {
          getAllAddedLocationsByClientId().then((res) => {
               if (res.success && res.data) {
                    setLocationsData(res.data.length > 0 ? res.data : []);
               }
          });
     }, []);

     useEffect(() => {
          if (coords) {
               setClientCoords({
                    latitude: coords?.latitude || 47.502994,
                    longitude: coords?.longitude || 19.044443,
               });
          }
     }, [coords, isGeolocationEnabled, t]);

     return (
          <Box
               component="main"
               sx={{
                    flexGrow: 1,
                    py: 8,
               }}
          >
               <Container maxWidth="xl">
                    <Stack spacing={3}>
                         <Stack spacing={1}>
                              <Typography variant="h4">{t('locations.locationCreate')}</Typography>
                              <Breadcrumbs separator={<BreadcrumbsSeparator />}>
                                   <Link
                                        color="text.primary"
                                        component={RouterLink}
                                        href={paths.dashboard.index}
                                        variant="subtitle2"
                                   >
                                        {t('nav.dashboard')}
                                   </Link>
                                   <Link
                                        color="text.primary"
                                        component={RouterLink}
                                        href={paths.dashboard.locations.index}
                                        variant="subtitle2"
                                   >
                                        {t('nav.locations')}
                                   </Link>
                                   <Typography color="text.secondary" variant="subtitle2">
                                        {t('locations.locationCreate')}
                                   </Typography>
                              </Breadcrumbs>
                         </Stack>
                         <LocationCreateForm
                              mapBoxAccessToken={mapBoxAccessToken}
                              locationsData={locationsData}
                              clientCoords={clientCoords}
                              userSession={userSession}
                         />
                    </Stack>
               </Container>
          </Box>
     );
};

export default NewLocation;
