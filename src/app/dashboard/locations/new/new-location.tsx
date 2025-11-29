'use client';

import { Alert, Button } from '@mui/material';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useGeolocated } from 'react-geolocated';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { RouterLink } from 'src/components/router-link';
import { UserDataCombined } from 'src/libs/supabase/server-auth';
import { paths } from 'src/paths';
import LocationCreateForm from 'src/sections/dashboard/locations/location-create-form';
import { BuildingLocation } from 'src/types/location';
import CircularProgress from '@mui/material/CircularProgress';

type NewLocationProps = {
     mapBoxAccessToken?: string;
     clientLocations: BuildingLocation[];
     userData?: UserDataCombined;
}

const NewLocation = ({ mapBoxAccessToken, clientLocations, userData }: NewLocationProps) => {

     const { t } = useTranslation();
     const [locationsData, setLocationsData] = useState<BuildingLocation[]>(clientLocations);
     const [clientCoords, setClientCoords] = useState<{ latitude: number; longitude: number } | null>(null);
     const [isNavigatingToList, setIsNavigatingToList] = useState(false);


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
          if (clientLocations && clientLocations.length > 0) {
               setLocationsData(clientLocations);
               if (!didSet) {
                    const firstLoc = clientLocations[0];
                    if (firstLoc.latitude && firstLoc.longitude) {
                         setClientCoords({ latitude: firstLoc.latitude, longitude: firstLoc.longitude });
                    }
               }
          }
          if (!coords && !isGeolocationEnabled) {
               toast.error(t('locations.geoLocationNotAvailable'));
          }
     }, [clientLocations, coords, isGeolocationEnabled, t]);

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
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                   <Typography variant="h4">{t('locations.locationCreate')}</Typography>
                                   <Alert severity="warning">
                                        {t('locations.unassignedCleanupWarning')}
                                   </Alert>
                                   <Button
                                        LinkComponent={RouterLink}
                                        href='/dashboard/locations'
                                        sx={{ backgroundColor: 'primary.main', color: 'common.white' }}
                                        onClick={() => setIsNavigatingToList(true)}
                                        disabled={isNavigatingToList}
                                        startIcon={isNavigatingToList ? <CircularProgress size={16} color="inherit" /> : undefined}
                                   >
                                        {t('locations.locationsTitle')}
                                   </Button>
                              </Box>
                              <Breadcrumbs separator={<KeyboardArrowRightIcon />}>
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
                         <Alert severity="warning" sx={{ mt: 2 }}>
                              {t('locations.unassignedCleanupWarning')}
                         </Alert>
                    </Stack>
               </Container>
          </Box>
     );
};

export default NewLocation;
