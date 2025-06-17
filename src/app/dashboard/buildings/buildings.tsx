'use client';

import type { ChangeEvent, MouseEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import PlusIcon from '@untitled-ui/icons-react/build/esm/Plus';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';

import { BreadcrumbsSeparator } from 'src/components/breadcrumbs-separator';
import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import { BuildingListSearch } from 'src/sections/dashboard/buildings/building-list-search';
import { BuildingListTable } from 'src/sections/dashboard/buildings/building-list-table';
import type { Building } from 'src/types/building';
import { useTranslation } from 'react-i18next';
import { BaseEntity } from 'src/types/base-entity';

const amenityKeyMap: Record<string, keyof Building> = {
  'common.lblHasParkingLot': 'has_parking_lot',
  'common.lblHasGasHeating': 'has_gas_heating',
  'common.lblHasCentralHeating': 'has_central_heating',
  'common.lblHasElectricHeating': 'has_electric_heating',
  'common.lblHasSolarPower': 'has_solar_power',
  'common.lblHasBicycleRoom': 'has_bicycle_room',
  'common.lblHasPreHeatedWater': 'has_pre_heated_water',
  'common.lblHasElevator': 'has_elevator',
  'common.lblIsRecentlyBuilt': 'is_recently_built',
};

export interface BuildingSearchFilters {
  address?: string;
  amenities: string[];
  statuses: string[];
}

export interface BuildingsSearchState {
  filters: BuildingSearchFilters;
  page: number;
  rowsPerPage: number;
}

const useBuildingsSearch = () => {

  const [state, setState] = useState<BuildingsSearchState>({
    filters: {
      address: undefined,
      amenities: [],
      statuses: [],
    },
    page: 0,
    rowsPerPage: 5,
  });

  const handleFiltersChange = useCallback((filters: BuildingSearchFilters): void => {
    setState((prevState) => ({
      ...prevState,
      filters,
      page: 0, // reset to first page on filter change
    }));
  }, []);

  const handlePageChange = useCallback((_event: MouseEvent<HTMLButtonElement> | null, page: number): void => {
    setState((prevState) => ({
      ...prevState,
      page,
    }));
  }, []);

  const handleRowsPerPageChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setState((prevState) => ({
      ...prevState,
      rowsPerPage: parseInt(event.target.value, 10),
      page: 0,
    }));
  }, []);

  return {
    handleFiltersChange,
    handlePageChange,
    handleRowsPerPageChange,
    state,
  };
};

type BuildingTableProps = {
  clientBuildings: Building[];
  buildingStatuses: (BaseEntity & { resource_string: string })[]
};

const Buildings = ({ clientBuildings, buildingStatuses }: BuildingTableProps) => {

  const { t } = useTranslation();
  const buildingSearch = useBuildingsSearch();

  const statusMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    buildingStatuses.forEach((status) => {
      map[status.resource_string] = status.id!;
    });
    return map;
  }, [buildingStatuses]);


  const [addBuildingLoading, setAddBuildingLoading] = useState(false);
  // Optional: filter logic here, if needed
  const filteredBuildings = useMemo(() => {
    const { address, amenities, statuses } = buildingSearch.state.filters;

    return clientBuildings.filter((building) => {

      const location = building.building_location;

      const matchesAddress = address
        ? location?.street_address.toLowerCase().includes(address.toLowerCase())
        : true;

      const matchesAmenities = amenities.length
        ? amenities.every((resourceKey: string) => {
          const fieldKey = amenityKeyMap[resourceKey];
          return fieldKey && building[fieldKey];
        })
        : true;

      const matchesStatuses = statuses.length
        ? statuses.some((r) => statusMap[r] === building.building_status)
        : true;


      return matchesAddress && matchesAmenities && matchesStatuses
    });
  }, [clientBuildings, buildingSearch.state.filters]);


  const paginatedBuildings = useMemo(() => {
    const start = buildingSearch.state.page * buildingSearch.state.rowsPerPage;
    const end = start + buildingSearch.state.rowsPerPage;
    return filteredBuildings.slice(start, end);
  }, [filteredBuildings, buildingSearch.state.page, buildingSearch.state.rowsPerPage]);

  return (

    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="xl">
        <Stack spacing={4}>
          <Stack direction="row" justifyContent="space-between" spacing={4}>
            <Stack spacing={1}>
              <Typography variant="h4">{t('buildings.buildingList')}</Typography>
              <Breadcrumbs separator={<BreadcrumbsSeparator />}>
                <Link color="text.primary" component={RouterLink} href={paths.dashboard.index} variant="subtitle2">
                  {t('nav.adminDashboard')}
                </Link>
                <Typography color="text.secondary" variant="subtitle2">
                  {t('buildings.buildingList')}
                </Typography>
              </Breadcrumbs>
            </Stack>
            <Button
              sx={{ height: 40 }}
              component={RouterLink}
              href={paths.dashboard.buildings.new}
              onClick={() => setAddBuildingLoading(true)}
              startIcon={
                <SvgIcon>
                  <PlusIcon />
                </SvgIcon>
              }
              variant="contained"
              loading={addBuildingLoading}
            >
              {t('common.btnCreate')}
            </Button>
          </Stack>

          <Card>
            <BuildingListSearch onFiltersChange={buildingSearch.handleFiltersChange} buildingStatuses={buildingStatuses} />
            <BuildingListTable
              items={paginatedBuildings}
              count={filteredBuildings.length}
              page={buildingSearch.state.page}
              rowsPerPage={buildingSearch.state.rowsPerPage}
              onPageChange={buildingSearch.handlePageChange}
              onRowsPerPageChange={buildingSearch.handleRowsPerPageChange}
              buildingStatuses={buildingStatuses}
            />
          </Card>
        </Stack>
      </Container>
    </Box>

  );
};

export default Buildings;
