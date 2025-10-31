'use client';

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
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import { useTranslation } from 'react-i18next';
import { Building, buildingStatusMap } from 'src/types/building';
import { GenericTable } from 'src/components/generic-table';
import { SearchAndBooleanFilters } from 'src/components/filter-list-search';
import { deleteBuilding } from 'src/app/actions/building/building-actions';
import toast from 'react-hot-toast';
import { CoverImageCell } from 'src/components/cover-image-cell';


interface BuildingTableProps {
  clientBuildings: Building[];
}

const Buildings = ({ clientBuildings }: BuildingTableProps) => {
  const { t } = useTranslation();
  const [addBuildingLoading, setAddBuildingLoading] = useState(false);
  const [deletingBuildingId, setDeletingBuildingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    search?: string;
    building_status?: string;
    has_bicycle_room?: boolean;
    has_parking_lot?: boolean;
    has_elevator?: boolean;
    has_gas_heating?: boolean;
    has_central_heating?: boolean;
    is_recently_built?: boolean;
    has_electric_heating?: boolean;
    has_solar_power?: boolean;
    has_pre_heated_water?: boolean;
  }>({});

  const handleFiltersChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  const filteredBuildings = useMemo(() => {
    const search = filters.search?.toLowerCase().trim();
    return clientBuildings.filter(b => {
      // status filter
      if (filters.building_status && b.building_status !== filters.building_status) return false;
      // boolean feature toggles
      const booleanKeys: (keyof typeof filters)[] = [
        'has_bicycle_room', 'has_parking_lot', 'has_elevator', 'has_gas_heating', 'has_central_heating', 'is_recently_built', 'has_electric_heating', 'has_solar_power', 'has_pre_heated_water'
      ];
      for (const k of booleanKeys) {
        if (filters[k] === true && (b as any)[k] !== true) return false; // require feature present
      }
      if (search) {
        const loc = b.building_location;
        const haystack = [
          b.id,
          b.building_status,
          loc?.city,
          loc?.street_address,
          loc?.street_number
        ].filter(Boolean).map(v => String(v).toLowerCase()).join(' ');
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [clientBuildings, filters]);

  const handleDeleteConfirm = useCallback(async (buildingId: string) => {
    setDeletingBuildingId(buildingId);
    const deleteBuildingResponse = await deleteBuilding(buildingId);
    if (deleteBuildingResponse.success) {
      toast.success(t('common.actionDeleteSuccess'));
    } else {
      toast.error(t('common.actionDeleteError'));
    }
    setDeletingBuildingId(null);
  }, [t]);

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="xl">
        <Stack spacing={4}>
          <Stack direction="row" justifyContent="space-between" spacing={4}>
            <Stack spacing={1}>
              <Typography variant="h4">{t('buildings.buildingList')}</Typography>
              <Breadcrumbs separator={<KeyboardArrowRightIcon />}>
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

          <Card sx={{ mb: 2 }}>
            <SearchAndBooleanFilters
              value={filters}
              onChange={handleFiltersChange}
              selects={[
                {
                  field: 'building_status',
                  label: 'buildings.buildingStatus',
                  options: Object.entries(buildingStatusMap).map(([value, label]) => ({ value, label }))
                }
              ]}
              fields={[
                { field: 'has_bicycle_room', label: 'common.lblHasBicycleRoom' },
                { field: 'has_parking_lot', label: 'common.lblHasParkingLot' },
                { field: 'has_elevator', label: 'common.lblHasElevator' },
                { field: 'has_gas_heating', label: 'common.lblHasGasHeating' },
                { field: 'has_central_heating', label: 'common.lblHasCentralHeating' },
                { field: 'is_recently_built', label: 'common.lblRecentlyBuilt' },
                { field: 'has_electric_heating', label: 'common.lblHasElectricHeating' },
                { field: 'has_solar_power', label: 'common.lblHasSolarPower' },
                { field: 'has_pre_heated_water', label: 'common.lblHasPreHeatedWater' },
              ]}
            />
          </Card>

          <Card>
            <GenericTable<Building>
              items={filteredBuildings}
              baseUrl="/dashboard/buildings"
              columns={[
                {
                  key: 'building_images',
                  label: t('common.lblCoverImage'),
                  render: (_v, row) => {
                    const imgs = Array.isArray(row.building_images) ? (row.building_images as any[]) : [];
                    const cover = imgs.find((im) => im && typeof im === 'object' && im.is_cover_image) as (typeof imgs)[0] | undefined;
                    const bucket = (cover?.storage_bucket as string) ?? (process.env.SUPABASE_S3_CLIENTS_DATA_BUCKET as string);
                    const path = cover?.storage_path as string | undefined;
                    return (
                      <CoverImageCell
                        bucket={bucket}
                        path={path}
                        width={64}
                        height={40}
                      />
                    );
                  }
                },
                {
                  key: 'building_location',
                  label: t('locations.locationCity'),
                  render: (_, item) => {
                    const loc = item.building_location;
                    if (!loc) return '-';
                    const city = loc.city ?? '-';
                    const street = `${loc.street_address ?? ''} ${loc.street_number ?? ''}`.trim();
                    return `${city}${street ? ' / ' + street : ''}`;
                  }
                },
                { key: 'building_status', label: t('buildings.buildingStatus'), render: (val) => t(buildingStatusMap[val as string] || val as string) },
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
              rowActions={[
                (building, openActionDialog) => (
                  <Button
                    color="error"
                    variant="outlined"
                    size="small"
                    loading={deletingBuildingId === building.id}
                    disabled={deletingBuildingId !== null}
                    onClick={() => openActionDialog({
                      id: building.id,
                      title: t('warning.deleteWarningTitle'),
                      message: t('warning.deleteWarningMessage'),
                      confirmText: t('common.btnDelete'),
                      cancelText: t('common.btnClose'),
                      onConfirm: () => handleDeleteConfirm(building.id)
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

export default Buildings;
