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
import { useTranslation } from 'react-i18next';
import { Building } from 'src/types/building';
import { SearchAndBooleanFilters } from 'src/components/filter-list-search';
import { GenericTable } from 'src/components/table';
import { deleteBuilding } from 'src/app/actions/building/building-actions';
import toast from 'react-hot-toast';

export type BuildingFilters = {
  search?: string;
  [key: string]: boolean | string | undefined;
};

interface BuildingsSearchState {
  filters: BuildingFilters;
  page: number;
  rowsPerPage: number;
}

const useBuildingsSearch = () => {
  const [state, setState] = useState<BuildingsSearchState>({
    filters: {},
    page: 0,
    rowsPerPage: 5,
  });

  const handleFiltersChange = useCallback((filters: BuildingFilters): void => {
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

  return { state, handleFiltersChange, handlePageChange, handleRowsPerPageChange };
};

interface BuildingTableProps {
  clientBuildings: Building[];
}

const Buildings = ({ clientBuildings }: BuildingTableProps) => {
  const { t } = useTranslation();
  const buildingSearch = useBuildingsSearch();
  const [addBuildingLoading, setAddBuildingLoading] = useState(false);

  const filteredBuildings = useMemo(() => {
    const { search, ...booleanFilters } = buildingSearch.state.filters;

    return clientBuildings.filter((building) => {
      const location = building.building_location;

      const matchesSearch = search
        ? location?.street_address.toLowerCase().includes(search.toLowerCase())
        : true;

      const matchesBooleanFields = Object.entries(booleanFilters).every(([field, expected]) => {
        return expected === undefined || building[field as keyof Building] === expected;
      });

      return matchesSearch && matchesBooleanFields;
    });
  }, [clientBuildings, buildingSearch.state.filters]);

  const paginatedBuildings = useMemo(() => {
    const start = buildingSearch.state.page * buildingSearch.state.rowsPerPage;
    const end = start + buildingSearch.state.rowsPerPage;
    return filteredBuildings.slice(start, end);
  }, [filteredBuildings, buildingSearch.state.page, buildingSearch.state.rowsPerPage]);

  const handleDeleteConfirm = useCallback(async (buildingId: string) => {
    const deleteBuildingResponse = await deleteBuilding(buildingId);
    if (deleteBuildingResponse.success) {
      toast.success(t('common.actionDeleteSuccess'));
    } else {
      toast.error(t('common.actionDeleteError'));
    }
  }, [t]);

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
              startIcon={<SvgIcon><PlusIcon /></SvgIcon>}
              variant="contained"
              loading={addBuildingLoading}
            >
              {t('common.btnCreate')}
            </Button>
          </Stack>

          <Card>
            <SearchAndBooleanFilters
              fields={[
                { field: 'has_parking_lot', label: 'common.lblHasParkingLot' },
                { field: 'has_gas_heating', label: 'common.lblHasGasHeating' },
                { field: 'has_central_heating', label: 'common.lblHasCentralHeating' },
                { field: 'has_electric_heating', label: 'common.lblHasElectricHeating' },
                { field: 'has_solar_power', label: 'common.lblHasSolarPower' },
                { field: 'has_bicycle_room', label: 'common.lblHasBicycleRoom' },
                { field: 'has_pre_heated_water', label: 'common.lblHasPreHeatedWater' },
                { field: 'has_elevator', label: 'common.lblHasElevator' },
                { field: 'is_recently_built', label: 'common.lblRecentlyBuilt' },
              ]}
              value={buildingSearch.state.filters}
              onChange={(newFilters) => {
                buildingSearch.handleFiltersChange({
                  ...buildingSearch.state.filters,
                  ...newFilters
                });
              }}
            />

            <GenericTable<Building>
              items={paginatedBuildings}
              page={buildingSearch.state.page}
              rowsPerPage={buildingSearch.state.rowsPerPage}
              onPageChange={buildingSearch.handlePageChange}
              onRowsPerPageChange={buildingSearch.handleRowsPerPageChange}
              count={filteredBuildings.length}
              baseUrl="/dashboard/buildings"
              handleDeleteConfirm={({ id }) => {
                handleDeleteConfirm(id);
              }}
              columns={[
                {
                  key: 'cover_image',
                  label: t('common.lblCoverImage'),
                  render: (value) => value ? <img src={value as string} alt="cover" width={64} height={40} /> : null
                },
                {
                  key: 'building_location',
                  label: t('locations.locationCity'),
                  render: (_, item) => item.building_location?.city ?? '-'
                },
                {
                  key: 'building_location',
                  label: t('locations.locationStreet'),
                  render: (_, item) => `${item.building_location?.street_address ?? ''} ${item.building_location?.street_number ?? ''}`
                },
                { key: 'building_status', label: t('buildings.buildingStatus') },
                { key: 'has_bicycle_room', label: t('common.lblHasBicycleRoom') },
                { key: 'has_parking_lot', label: t('common.lblHasParkingLot') },
                { key: 'has_elevator', label: t('common.lblHasElevator') },
                { key: 'has_gas_heating', label: t('common.lblHasGasHeating') },
                { key: 'has_central_heating', label: t('common.lblHasCentralHeating') },
                { key: 'is_recently_built', label: t('common.lblRecentlyBuilt') },
                { key: 'has_electric_heating', label: t('common.lblHasElectricHeating') },
                { key: 'has_solar_power', label: t('common.lblHasSolarPower') },
                { key: 'has_pre_heated_water', label: t('common.lblHasPreHeatedWater') },
              ]}
            />
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default Buildings;
