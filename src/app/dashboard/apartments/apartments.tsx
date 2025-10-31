'use client';

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
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import { useTranslation } from 'react-i18next';
import {
  apartmentStatusMap,
  apartmentTypeMap,
  type Apartment,
} from 'src/types/apartment';
import { GenericTable } from 'src/components/generic-table';
import { SearchAndBooleanFilters } from 'src/components/filter-list-search';
import { deleteApartment } from 'src/app/actions/apartment/apartment-actions';
import { CoverImageCell } from 'src/components/cover-image-cell';
import { toast } from 'react-hot-toast';


interface ApartmentsProps {
  apartments: Apartment[];
}

const Apartments = ({ apartments }: ApartmentsProps) => {
  const { t } = useTranslation();
  const [addApartmentLoading, setAddApartmentLoading] = useState(false);
  const [deletingApartmentId, setDeletingApartmentId] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ search?: string; apartment_type?: string; apartment_status?: string }>({});

  const handleFiltersChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  const filteredApartments = useMemo(() => {
    const search = filters.search?.toLowerCase().trim();
    return apartments.filter(a => {
      // Type filter
      if (filters.apartment_type && a.apartment_type !== filters.apartment_type) return false;
      // Status filter
      if (filters.apartment_status && a.apartment_status !== filters.apartment_status) return false;
      // Search across: apartment number, floor, square_meters, location city/street, building id
      if (search) {
        const b: any = (a as any).building;
        const loc = b?.building_location;
        const haystack = [
          a.apartment_number,
          a.floor,
          a.square_meters,
          loc?.city,
          loc?.street_address,
          loc?.street_number,
          a.id
        ].filter(Boolean).map(v => String(v).toLowerCase()).join(' ');
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [apartments, filters]);

  const handleDelete = useCallback(async (apartmentId: string) => {
    setDeletingApartmentId(apartmentId);
    const deleteApartmentResponse = await deleteApartment(apartmentId);
    if (deleteApartmentResponse.success) {
      toast.success(t('common.actionDeleteSuccess'));
    } else {
      toast.error(t('common.actionDeleteError'));
    }
    setDeletingApartmentId(null);
  }, [t]);

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="xl">
        <Stack spacing={4}>
          <Stack direction="row" justifyContent="space-between" spacing={4}>
            <Stack spacing={1}>
              <Typography variant="h4">{t('apartments.apartmentList')}</Typography>
              <Breadcrumbs separator={<KeyboardArrowRightIcon />}>
                <Link
                  color="text.primary"
                  component={RouterLink}
                  href={paths.dashboard.index}
                  variant="subtitle2"
                >
                  {t('nav.adminDashboard')}
                </Link>
                <Typography color="text.secondary" variant="subtitle2">
                  {t('apartments.apartmentList')}
                </Typography>
              </Breadcrumbs>
            </Stack>
            <Button
              sx={{ height: 40 }}
              component={RouterLink}
              href={paths.dashboard.apartments.new}
              onClick={() => setAddApartmentLoading(true)}
              startIcon={
                <SvgIcon>
                  <PlusIcon />
                </SvgIcon>
              }
              variant="contained"
              loading={addApartmentLoading}
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
                  field: 'apartment_type',
                  label: 'apartments.lblType',
                  options: Object.keys(apartmentTypeMap).map(k => ({ value: k, label: apartmentTypeMap[k as keyof typeof apartmentTypeMap] }))
                },
                {
                  field: 'apartment_status',
                  label: 'apartments.lblRentalStatus',
                  options: Object.keys(apartmentStatusMap).map(k => ({ value: k, label: apartmentStatusMap[k as keyof typeof apartmentStatusMap] }))
                }
              ]}
            />
          </Card>

          <Card>
            <GenericTable<Apartment>
              items={filteredApartments}
              baseUrl="/dashboard/apartments"
              columns={[
                {
                  key: 'apartment_images',
                  label: t('apartments.lblCoverImage'),
                  render: (_v, row) => {
                    const imgs = Array.isArray(row.apartment_images) ? (row.apartment_images as any[]) : [];
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
                  key: 'building_id',
                  label: `${t('locations.locationCity')} / ${t('locations.locationStreet')}`,
                  render: (_v, item) => {
                    const b = (item as any).building;
                    const loc = b?.building_location;
                    if (!loc) return '-';
                    const city = loc.city ?? '-';
                    const street = `${loc.street_address ?? ''} ${loc.street_number ?? ''}`.trim();
                    return `${city}${street ? ' / ' + street : ''}`;
                  }
                },
                { key: 'apartment_number', label: t('apartments.lblApartmentNumber') },
                { key: 'floor', label: t('apartments.lblFloor') },
                {
                  key: 'apartment_type',
                  label: t('apartments.lblType'),
                  render: (value) => t(apartmentTypeMap[value as keyof typeof apartmentTypeMap])
                },
                {
                  key: 'apartment_status',
                  label: t('apartments.lblRentalStatus'),
                  render: (value) => t(apartmentStatusMap[value as keyof typeof apartmentStatusMap])
                },
                {
                  key: 'square_meters',
                  label: t('apartments.lblSizeM2')
                }
              ]}
              rowActions={[
                (apartment, openActionDialog) => (
                  <Button
                    color="error"
                    variant="outlined"
                    size="small"
                    loading={deletingApartmentId === apartment.id}
                    disabled={deletingApartmentId !== null}
                    onClick={() => openActionDialog({
                      id: apartment.id,
                      title: t('warning.deleteWarningTitle'),
                      message: t('warning.deleteWarningMessage'),
                      confirmText: t('common.btnDelete'),
                      cancelText: t('common.btnClose'),
                      onConfirm: () => handleDelete(apartment.id)
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

export default Apartments;
