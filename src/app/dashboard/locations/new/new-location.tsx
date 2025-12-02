'use client';

import { Alert, Button } from '@mui/material';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useGeolocated } from 'react-geolocated';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { RouterLink } from 'src/components/router-link';
import { UserDataCombined } from 'src/libs/supabase/server-auth';
import { paths } from 'src/paths';
import LocationCreateForm from 'src/sections/dashboard/locations/location-create-form';
import { BuildingLocation } from 'src/types/location';
import CircularProgress from '@mui/material/CircularProgress';
import { EntityFormHeader, type BreadcrumbItem } from 'src/components/entity-form-header';

type NewLocationProps = {
     mapBoxAccessToken?: string;
     clientLocations: BuildingLocation[];
     occupiedLocations?: BuildingLocation[];
     userData?: UserDataCombined;
}

const NewLocation = ({ mapBoxAccessToken, clientLocations, occupiedLocations = [], userData }: NewLocationProps) => {
     const { t } = useTranslation();
     const [locationsData, setLocationsData] = useState<BuildingLocation[]>([...clientLocations, ...occupiedLocations]);
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
          if ((clientLocations && clientLocations.length > 0) || occupiedLocations.length > 0) {
               setLocationsData([...clientLocations, ...occupiedLocations]);
               if (!didSet) {
                    const firstLoc = clientLocations[0] || occupiedLocations[0];
                    if (firstLoc.latitude && firstLoc.longitude) {
                         setClientCoords({ latitude: firstLoc.latitude, longitude: firstLoc.longitude });
                    }
               }
          }
          if (!coords && !isGeolocationEnabled) {
               toast.error(t('locations.geoLocationNotAvailable'));
          }
     }, [clientLocations, coords, isGeolocationEnabled, t]);

     const breadcrumbs: BreadcrumbItem[] = [
          {
               title: t('nav.dashboard', 'Dashboard'),
               href: paths.dashboard.index,
          },
          {
               title: t('nav.locations', 'Locations'),
               href: paths.dashboard.locations.index,
          },
          {
               title: t('locations.locationCreate', 'Create Location'),
          },
     ];

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
                         <EntityFormHeader
                              backHref={paths.dashboard.locations.index}
                              backLabel={t('common.btnBack', 'Back to list')}
                              title={t('locations.locationCreate')}
                              breadcrumbs={breadcrumbs}
                              actionComponent={
                                   <Button
                                        LinkComponent={RouterLink}
                                        href={paths.dashboard.locations.index}
                                        sx={{ backgroundColor: 'primary.main', color: 'common.white' }}
                                        onClick={() => setIsNavigatingToList(true)}
                                        disabled={isNavigatingToList}
                                        startIcon={isNavigatingToList ? <CircularProgress size={16} color="inherit" /> : undefined}
                                   >
                                        {t('locations.locationsTitle')}
                                   </Button>
                              }
                         />

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
