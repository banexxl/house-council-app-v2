'use client';

import type { ChangeEvent, MouseEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CircularProgress, Container, Stack } from '@mui/material';
import { paths } from 'src/paths';
import { useTranslation } from 'react-i18next';
import { BuildingLocation } from 'src/types/location';
import { deleteLocationByID } from 'src/app/actions/location/location-services';
import toast from 'react-hot-toast';
import { SearchAndBooleanFilters } from 'src/components/filter-list-search';
import { validate as isUUID } from 'uuid';
import { GenericTable } from 'src/components/generic-table';
import { EntityFormHeader } from 'src/components/entity-form-header';

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
               search: '',
          },
          page: 0,
          rowsPerPage: 5,
     });

     const handleFiltersChange = useCallback((filters: LocationFilters): void => {
          setState((prev) => ({ ...prev, filters, page: 0 }));
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

interface LocationsProps { locations: BuildingLocation[]; }

const Locations = ({ locations }: LocationsProps) => {
     const { t } = useTranslation();
     const locationsSearch = useLocationsSearch();
     const [isNavigatingToCreate, setIsNavigatingToCreate] = useState(false);

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

     const handleDeleteLocationsConfirm = useCallback(async (locationId: string) => {
          const deleteLocationResponse = await deleteLocationByID(locationId);
          if (deleteLocationResponse.success) {
               toast.success(t('common.actionDeleteSuccess'));
          } else {
               toast.error(t('common.actionDeleteError'));
          }
     }, [t]);

     return (
          <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
               <Container maxWidth="xl">
                    <Stack spacing={4}>
                         <EntityFormHeader
                              backHref={paths.dashboard.index}
                              backLabel={t('nav.adminDashboard')}
                              title={t('locations.locationList')}
                              breadcrumbs={[
                                   { title: t('nav.adminDashboard'), href: paths.dashboard.index },
                                   { title: t('locations.locationList') },
                              ]}
                              actionComponent={
                                   <Button
                                        variant="contained"
                                        href={paths.dashboard.locations.new}
                                        onClick={() => setIsNavigatingToCreate(true)}
                                        disabled={isNavigatingToCreate}
                                        startIcon={isNavigatingToCreate ? <CircularProgress size={16} color="inherit" /> : undefined}
                                   >
                                        {t('common.btnCreate')}
                                   </Button>
                              }
                         />
                         <Alert severity="warning">
                              {t('locations.unassignedCleanupWarning')}
                         </Alert>

                         <Card sx={{ mb: 2 }}>
                              <SearchAndBooleanFilters
                                   fields={[{ field: 'location_occupied', label: 'locations.locationTaken' }]}
                                   value={locationsSearch.state.filters}
                                   onChange={(newFilters) => locationsSearch.handleFiltersChange(newFilters)}
                              />
                         </Card>

                         <Card>
                              <GenericTable<BuildingLocation>
                                   items={filteredLocations}
                                   page={locationsSearch.state.page}
                                   rowsPerPage={locationsSearch.state.rowsPerPage}
                                   onPageChange={locationsSearch.handlePageChange}
                                   onRowsPerPageChange={locationsSearch.handleRowsPerPageChange}
                                   count={filteredLocations.length}
                                   columns={[
                                        { key: 'street_address', label: t('locations.locationStreet') },
                                        { key: 'street_number', label: t('locations.locationStreetNumber') },
                                        { key: 'city', label: t('locations.locationCity') },
                                        { key: 'region', label: t('locations.locationState') },
                                        { key: 'country', label: t('locations.locationCountry') },
                                        { key: 'post_code', label: t('locations.locationZipCode') },
                                        { key: 'building_id', label: t('locations.locationTaken'), render: (value) => isUUID(value as string) ? t('common.lblYes') : t('common.lblNo') },
                                   ]}
                                   rowActions={[
                                        (location, openActionDialog) => (
                                             <Button
                                                  color="error"
                                                  variant="outlined"
                                                  size="small"
                                                  onClick={() => openActionDialog({
                                                       id: location.id,
                                                       title: t('warning.deleteWarningTitle'),
                                                       message: t('warning.deleteWarningMessage'),
                                                       confirmText: t('common.btnDelete'),
                                                       cancelText: t('common.btnClose'),
                                                       onConfirm: () => handleDeleteLocationsConfirm(location.id)
                                                  })}
                                             >
                                                  {t('common.btnDelete')}
                                             </Button>
                                        )
                                   ]}
                              />
                         </Card>
                    </Stack>
               </Container>
          </Box>
     );
};

export default Locations;
