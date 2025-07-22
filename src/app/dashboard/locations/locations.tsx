'use client';

import type { ChangeEvent, MouseEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import PlusIcon from '@untitled-ui/icons-react/build/esm/Plus';
import {
     Box,
     Breadcrumbs,
     Button,
     Card,
     Container,
     Link,
     Stack,
     SvgIcon,
     Typography,
} from '@mui/material';

import { BreadcrumbsSeparator } from 'src/components/breadcrumbs-separator';
import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import { useTranslation } from 'react-i18next';
import { LocationsTable } from 'src/sections/dashboard/locations/locations-list-table';
import { BuildingLocation } from 'src/types/location';
import { deleteLocationByID } from 'src/app/actions/location/location-services';
import toast from 'react-hot-toast';
import { SearchAndBooleanFilters } from 'src/components/filter-list-search';

export type LocationFilters = {
     location_occupied?: boolean;
     search?: string;
};

interface LocationsSearchState {
     filters: LocationFilters;
     page: number;
     rowsPerPage: number;
}

const useLocationsSearch = () => {
     const [state, setState] = useState<LocationsSearchState>({
          filters: {
               location_occupied: undefined,
          },
          page: 0,
          rowsPerPage: 5,
     });

     const handleFiltersChange = useCallback((filters: LocationFilters): void => {
          setState((prev) => ({
               ...prev,
               filters,
               page: 0,
          }));
     }, []);

     const handlePageChange = useCallback(
          (_event: MouseEvent<HTMLButtonElement> | null, page: number): void => {
               setState((prev) => ({ ...prev, page }));
          },
          []
     );

     const handleRowsPerPageChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
          setState((prev) => ({
               ...prev,
               rowsPerPage: parseInt(event.target.value, 10),
               page: 0,
          }));
     }, []);

     return {
          state,
          handleFiltersChange,
          handlePageChange,
          handleRowsPerPageChange,
     };
};

interface LocationsProps {
     locations: BuildingLocation[];
}

const Locations = ({ locations }: LocationsProps) => {
     const { t } = useTranslation();
     const locationsSearch = useLocationsSearch();
     const [addLocationLoading, setAddLocationLoading] = useState(false);

     const filteredLocations = useMemo(() => {
          const { location_occupied, search } = locationsSearch.state.filters;

          return locations.filter((location) => {
               const matchesOccupied =
                    typeof location_occupied === 'boolean'
                         ? location.location_occupied === location_occupied
                         : true;

               const matchesSearch = search
                    ? location.street_address?.toLowerCase().includes(search.toLowerCase())
                    : true;

               return matchesOccupied && matchesSearch;
          });
     }, [locations, locationsSearch.state.filters]);


     const paginatedLocations = useMemo(() => {
          const start = locationsSearch.state.page * locationsSearch.state.rowsPerPage;
          const end = start + locationsSearch.state.rowsPerPage;
          return filteredLocations.slice(start, end);
     }, [filteredLocations, locationsSearch.state.page, locationsSearch.state.rowsPerPage]);

     const handleDeleteLocationsConfirm = useCallback(
          async (locationId: string) => {
               const deleteLocationResponse = await deleteLocationByID(locationId);
               if (deleteLocationResponse.success) {
                    toast.success(t('locations.locationDeletedSuccessfully'));
               } else {
                    toast.error(t('locations.locationNotDeleted'));
               }
          },
          [t]
     );

     return (
          <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
               <Container maxWidth="xl">
                    <Stack spacing={4}>
                         <Stack direction="row" justifyContent="space-between" spacing={4}>
                              <Stack spacing={1}>
                                   <Typography variant="h4">{t('locations.locationList')}</Typography>
                                   <Breadcrumbs separator={<BreadcrumbsSeparator />}>
                                        <Link
                                             color="text.primary"
                                             component={RouterLink}
                                             href={paths.dashboard.index}
                                             variant="subtitle2"
                                        >
                                             {t('nav.adminDashboard')}
                                        </Link>
                                        <Typography color="text.secondary" variant="subtitle2">
                                             {t('locations.locationList')}
                                        </Typography>
                                   </Breadcrumbs>
                              </Stack>
                              <Button
                                   sx={{ height: 40 }}
                                   component={RouterLink}
                                   href={paths.dashboard.locations.new}
                                   onClick={() => setAddLocationLoading(true)}
                                   startIcon={
                                        <SvgIcon>
                                             <PlusIcon />
                                        </SvgIcon>
                                   }
                                   variant="contained"
                                   loading={addLocationLoading}
                              >
                                   {t('common.btnCreate')}
                              </Button>
                         </Stack>

                         <Card>

                              <SearchAndBooleanFilters
                                   fields={[
                                        { field: 'location_occupied', label: 'locations.locationTaken' }
                                   ]}
                                   value={locationsSearch.state.filters}
                                   onChange={(newFilters) => {
                                        locationsSearch.handleFiltersChange(newFilters);
                                   }}
                              />

                              <LocationsTable
                                   items={paginatedLocations}
                                   page={locationsSearch.state.page}
                                   rowsPerPage={locationsSearch.state.rowsPerPage}
                                   onPageChange={locationsSearch.handlePageChange}
                                   onRowsPerPageChange={locationsSearch.handleRowsPerPageChange}
                                   count={filteredLocations.length}
                                   handleDeleteConfirm={(data) => {
                                        handleDeleteLocationsConfirm(data.locationId);
                                   }}
                              />
                         </Card>
                    </Stack>
               </Container>
          </Box>
     );
};

export default Locations;
