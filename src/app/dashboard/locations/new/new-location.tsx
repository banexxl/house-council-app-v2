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
import { UserDataCombined } from 'src/libs/supabase/server-auth';
import { paths } from 'src/paths';
import LocationCreateForm from 'src/sections/dashboard/locations/location-create-form';
import { BuildingLocation } from 'src/types/location';

type NewLoctionProps = {
     mapBoxAccessToken?: string;
     userData?: UserDataCombined;
}

const NewLocation = ({ mapBoxAccessToken, userData }: NewLoctionProps) => {

     const { t } = useTranslation();
     const [locationsData, setLocationsData] = useState<BuildingLocation[]>([]);
     const [clientCoords, setClientCoords] = useState<{ latitude: number; longitude: number } | null>(null);


     const { coords, isGeolocationEnabled } = useGeolocated({
          positionOptions: {
               enableHighAccuracy: true,
          },
          userDecisionTimeout: 5000,
     });

     useEffect(() => {
          let didSet = false;
          if (coords && isGeolocationEnabled) {
               setClientCoords({
                    latitude: coords.latitude,
                    longitude: coords.longitude,
               });
               toast.success(t('locations.geoLocationAvailable'));
               didSet = true;
          }
          getAllAddedLocationsByClientId(userData?.client?.id!).then((res) => {
               if (res.success && res.data) {
                    setLocationsData(res.data.length > 0 ? res.data : []);
                    if (!didSet && res.data.length > 0) {
                         const firstLoc = res.data[0];
                         if (firstLoc.latitude && firstLoc.longitude) {
                              setClientCoords({
                                   latitude: firstLoc.latitude,
                                   longitude: firstLoc.longitude,
                              });
                         }
                    }
               }
          });
          if (!coords && !isGeolocationEnabled) {
               toast.error(t('locations.geoLocationNotAvailable'));
          }
     }, [userData?.client?.id, coords, isGeolocationEnabled, t]);

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
                         {clientCoords ? (
                              <LocationCreateForm
                                   mapBoxAccessToken={mapBoxAccessToken}
                                   locationsData={locationsData}
                                   clientCoords={clientCoords}
                                   userData={userData}
                              />
                         ) : (
                              <Typography variant="body1">{t('locations.loadingLocation')}</Typography>
                         )}
                    </Stack>
               </Container>
          </Box>
     );
};

export default NewLocation;
