'use client'

import { useCallback, useMemo, useState, type ChangeEvent, type FC } from 'react';
import PropTypes from 'prop-types';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

import { Scrollbar } from 'src/components/scrollbar';
import { paths } from 'src/paths';
import { useTranslation } from 'react-i18next';
import { useSelection } from 'src/hooks/use-selection';
import { useDialog } from 'src/hooks/use-dialog';
import { PopupModal } from 'src/components/modal-dialog';
import { applySort } from 'src/utils/apply-sort';
import { useRouter } from 'next/navigation';
import { BuildingLocation } from 'src/types/location';
import { deleteLocationsByIDsAction } from 'src/app/actions/location-actions/location-services';
import { FilterBar } from '../client/table-filter';
import toast from 'react-hot-toast';

interface LocationsTableProps {
  items?: BuildingLocation[];
}

interface DeleteLocationsData {
  locationIds: string[];
}

const useLocationSearch = () => {

  const [state, setState] = useState({
    all: false,
    // has_accepted_marketing: false,
    // is_verified: false,
    // is_returning: false,
    query: '',
    page: 0,
    rowsPerPage: 5,
    sortBy: 'updated_at' as keyof BuildingLocation,
    sortDir: 'desc' as 'asc' | 'desc',
  });

  const handleQueryChange = useCallback((filters: Partial<typeof state>) => {
    setState((prevState) => ({
      ...prevState,
      ...filters,
    }));
  }, []);

  const handleTabsChange = useCallback((value: string) => {
    setState((prevState) => ({
      ...prevState,
      all: value === 'all',
      // has_accepted_marketing: value === 'has_accepted_marketing',
      // is_verified: value === 'is_verified',
      // is_returning: value === 'is_returning',
    }));
  }, []);

  const handlePageChange = useCallback((event: any, page: number) => {
    setState((prevState) => ({
      ...prevState,
      page,
    }));
  }, []);

  const handleRowsPerPageChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setState((prevState) => ({
      ...prevState,
      page: 0,
      rowsPerPage: parseInt(event.target.value, 10),
    }));
  }, []);

  const handleSortChange = useCallback((sortBy: keyof BuildingLocation, sortDir: 'asc' | 'desc') => {
    setState((prevState) => ({
      ...prevState,
      sortBy,
      sortDir,
    }));
  }, []);

  return {
    handleTabsChange,
    handleQueryChange,
    handleSortChange,
    handlePageChange,
    handleRowsPerPageChange,
    state,
  };
};

export const LocationsTable: FC<LocationsTableProps> = ({ items = [] }) => {

  const [count, setCount] = useState(items.length);
  const locationIds = useMemo(() => items.map((location) => location.id), [items]);
  const locationSelection = useSelection(locationIds);
  const selectedSome = locationSelection.selected.length > 0 && locationSelection.selected.length < locationIds.length;
  const selectedAll = items.length > 0 && locationSelection.selected.length === locationIds.length;
  const enableBulkActions = locationSelection.selected.length > 0;
  const router = useRouter();

  const deleteLocationsDialog = useDialog<DeleteLocationsData>();
  const locationSearch = useLocationSearch();

  const { t } = useTranslation();

  const handleDeleteLocationsClick = useCallback(() => {
    deleteLocationsDialog.handleOpen();
  }, [deleteLocationsDialog]);

  const handleDeleteLocationsConfirm = useCallback(async () => {
    deleteLocationsDialog.handleClose();
    const deleteLocationResponse = await deleteLocationsByIDsAction(locationSelection.selected);
    if (deleteLocationResponse.success) {
      toast.success(t('locations.locationDeletedSuccessfully'));
      locationSelection.handleDeselectAll();
    } else {
      toast.error(t('locations.locationNotDeleted'));
    }
  }, [deleteLocationsDialog]);

  const visibleRows = useMemo(() => {
    // Apply filters based on state
    const filtered = items.filter((location) => {
      // Check query filter
      const matchesQuery = !locationSearch.state.query || location.street_address.toLowerCase().includes(locationSearch.state.query.toLowerCase());

      // Check "all" filter (if "all" is true, no other filters apply)
      if (locationSearch.state.all) {
        return matchesQuery;
      }

      // // Apply individual filters
      // const matchesAcceptedMarketing =
      //   !locationSearch.state.has_accepted_marketing || location.has_accepted_marketing === locationSearch.state.has_accepted_marketing;

      // const matchesIsVerified =
      //   !locationSearch.state.is_verified || location.is_verified === locationSearch.state.is_verified;

      // const matchesIsReturning =
      //   !locationSearch.state.is_returning || location.is_returning === locationSearch.state.is_returning;
      // Combine all filters
      return matchesQuery //&& matchesAcceptedMarketing && matchesIsVerified && matchesIsReturning;
    });

    setCount(filtered.length);
    // Apply sorting and pagination
    return applySort(filtered, locationSearch.state.sortBy, locationSearch.state.sortDir).slice(
      locationSearch.state.page * locationSearch.state.rowsPerPage,
      locationSearch.state.page * locationSearch.state.rowsPerPage + locationSearch.state.rowsPerPage
    );
  }, [items, locationSearch.state]);

  return (
    <Box sx={{ position: 'relative' }}>
      <FilterBar
        onTabsChange={locationSearch.handleTabsChange}
        onFiltersChange={locationSearch.handleQueryChange}
        onSortChange={locationSearch.handleSortChange}
        sortBy={locationSearch.state.sortBy}
        sortDir={locationSearch.state.sortDir}
        tabs={[
          { label: t('common.all'), value: 'all' },
          // { label: t('locations.locationIsVerified'), value: 'is_verified' },
          // { label: t('locations.locationHasAcceptedMarketing'), value: 'has_accepted_marketing' },
          // { label: t('locations.locationIsReturning'), value: 'is_returning' },
        ]}
        sortOptions={[
          { label: t('locations.locationStreet'), value: 'street_address' },
          { label: t('locations.locationCity'), value: 'city' },
          { label: t('locations.locationCountry'), value: 'country' },
          { label: t('common.updatedAt'), value: 'updated_at' },
        ]}
        btnAddUrl={paths.dashboard.locations.new}
      />
      <Scrollbar>
        <Table sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow>
              {enableBulkActions && (
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    alignItems: 'center',
                    backgroundColor: (theme) =>
                      theme.palette.mode === 'dark' ? 'neutral.800' : 'neutral.50',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    px: 2,
                    py: 0.5,
                    zIndex: 10,
                  }}
                >
                  <Checkbox
                    checked={selectedAll}
                    indeterminate={selectedSome}
                    onChange={(event) => {
                      if (event.target.checked) {
                        locationSelection.handleSelectAll();
                      } else {
                        locationSelection.handleDeselectAll();
                      }
                    }}
                  />
                  <Button color="inherit" size="small" onClick={handleDeleteLocationsClick}>
                    {t('common.btnDelete')}
                  </Button>
                </Stack>
              )}
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedAll}
                  indeterminate={selectedSome}
                  onChange={(event) => {
                    if (event.target.checked) {
                      locationSelection.handleSelectAll();
                    } else {
                      locationSelection.handleDeselectAll();
                    }
                  }}
                />
              </TableCell>
              <TableCell>{t('locations.locationStreet')}</TableCell>
              <TableCell>{t('locations.locationStreetNumber')}</TableCell>
              <TableCell>{t('locations.locationCity')}</TableCell>
              <TableCell>{t('locations.locationState')}</TableCell>
              <TableCell>{t('locations.locationCountry')}</TableCell>
              <TableCell>{t('locations.locationZipCode')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {
              items.length > 0 ?
                visibleRows.map((location) => {
                  const isSelected = locationSelection.selected.includes(location.id);
                  return (
                    <TableRow hover key={location.id} selected={isSelected}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={(event) => {
                            if (event.target.checked) {
                              locationSelection.handleSelectOne(location.id);
                            } else {
                              locationSelection.handleDeselectOne(location.id);
                            }
                          }}
                        />
                      </TableCell>

                      <TableCell>{location.street_address}</TableCell>
                      <TableCell>{location.street_number}</TableCell>
                      <TableCell>{location.city}</TableCell>
                      <TableCell>{location.region}</TableCell>
                      <TableCell>{location.country}</TableCell>
                      <TableCell>{location.post_code}</TableCell>
                    </TableRow>
                  );
                })
                :
                <Typography sx={{ m: '20px' }}>
                  {t('common.emptyTableInfo')}
                </Typography>
            }
          </TableBody>
        </Table>
      </Scrollbar>
      <TablePagination
        component="div"
        count={count}
        onPageChange={locationSearch.handlePageChange}
        onRowsPerPageChange={locationSearch.handleRowsPerPageChange}
        page={locationSearch.state.page}
        rowsPerPage={locationSearch.state.rowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
        showFirstButton
        showLastButton
        labelRowsPerPage={t('common.rowsPerPage')}
      />
      <PopupModal
        isOpen={deleteLocationsDialog.open}
        onClose={() => deleteLocationsDialog.handleClose()}
        onConfirm={handleDeleteLocationsConfirm}
        title={t('warning.deleteWarningTitle')}
        confirmText={t('common.btnDelete')}
        cancelText={t('common.btnClose')}
        children={t('warning.deleteWarningMessage')}
        type={'confirmation'} />
    </Box>
  );
};

LocationsTable.propTypes = {
  items: PropTypes.array,
};
