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
import {
  apartmentStatusMap,
  apartmentTypeMap,
  type Apartment,
} from 'src/types/apartment';
import { SearchAndBooleanFilters } from 'src/components/filter-list-search';
import { GenericTable } from 'src/components/generic-table';
import { deleteApartment } from 'src/app/actions/apartment/apartment-actions';
import { toast } from 'react-hot-toast';

export type ApartmentFilters = {
  apartment_number?: string;
  [key: string]: string | boolean | undefined;
};

export interface ApartmentsSearchState {
  filters: ApartmentFilters;
  page: number;
  rowsPerPage: number;
}

const useApartmentsSearch = () => {
  const [state, setState] = useState<ApartmentsSearchState>({
    filters: {
      apartment_number: undefined,
    },
    page: 0,
    rowsPerPage: 5,
  });

  const handleFiltersChange = useCallback((filters: ApartmentFilters): void => {
    setState((prev) => ({ ...prev, filters, page: 0 }));
  }, []);

  const handlePageChange = useCallback(
    (_event: MouseEvent<HTMLButtonElement> | null, page: number): void => {
      setState((prev) => ({ ...prev, page }));
    },
    []
  );

  const handleRowsPerPageChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setState((prev) => ({
        ...prev,
        rowsPerPage: parseInt(event.target.value, 10),
        page: 0,
      }));
    },
    []
  );

  return {
    state,
    handleFiltersChange,
    handlePageChange,
    handleRowsPerPageChange,
  };
};

interface ApartmentsProps {
  apartments: Apartment[];
}

const Apartments = ({ apartments }: ApartmentsProps) => {
  const { t } = useTranslation();
  const apartmentSearch = useApartmentsSearch();
  const [addApartmentLoading, setAddApartmentLoading] = useState(false);

  const filteredApartments = useMemo(() => {
    const { apartment_number, ...boolFilters } = apartmentSearch.state.filters;

    return apartments.filter((apartment) => {
      const matchesNumber = apartment_number
        ? apartment.apartment_number?.toLowerCase().includes(apartment_number.toLowerCase())
        : true;

      const matchesType = boolFilters['residential'] || boolFilters['business'] || boolFilters['mixed_use'] || boolFilters['vacation'] || boolFilters['storage'] || boolFilters['garage'] || boolFilters['utility']
        ? Boolean(boolFilters[apartment.apartment_type])
        : true;

      const matchesStatus = boolFilters['owned'] || boolFilters['rented'] || boolFilters['for_rent'] || boolFilters['vacant']
        ? Boolean(boolFilters[apartment.apartment_status])
        : true;

      return matchesNumber && matchesType && matchesStatus;
    });
  }, [apartments, apartmentSearch.state.filters]);

  const paginatedApartments = useMemo(() => {
    const start = apartmentSearch.state.page * apartmentSearch.state.rowsPerPage;
    const end = start + apartmentSearch.state.rowsPerPage;
    return filteredApartments.slice(start, end);
  }, [filteredApartments, apartmentSearch.state.page, apartmentSearch.state.rowsPerPage]);

  const handleDelete = useCallback(async (apartmentId: string) => {
    const deleteApartmentResponse = await deleteApartment(apartmentId);
    if (deleteApartmentResponse.success) {
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
              <Typography variant="h4">{t('apartments.apartmentList')}</Typography>
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

          <Card>
            <SearchAndBooleanFilters
              fields={[
                { field: 'residential', label: 'apartments.lblApartmentTypeResidential' },
                { field: 'business', label: 'apartments.lblApartmentTypeBusiness' },
                { field: 'mixed_use', label: 'apartments.lblApartmentTypeMixedUse' },
                { field: 'vacation', label: 'apartments.lblApartmentTypeVacation' },
                { field: 'storage', label: 'apartments.lblApartmentTypeStorage' },
                { field: 'garage', label: 'apartments.lblApartmentTypeGarage' },
                { field: 'utility', label: 'apartments.lblApartmentTypeUtility' },
                { field: 'owned', label: 'apartments.lblOwned' },
                { field: 'rented', label: 'apartments.lblRented' },
                { field: 'for_rent', label: 'apartments.lblForRent' },
                { field: 'vacant', label: 'apartments.lblVacant' },
              ]}
              value={apartmentSearch.state.filters}
              onChange={(newFilters: Partial<ApartmentFilters>) => {
                apartmentSearch.handleFiltersChange({
                  ...apartmentSearch.state.filters,
                  ...newFilters,
                });
              }}
            />
            <GenericTable<Apartment>
              items={paginatedApartments}
              count={filteredApartments.length}
              page={apartmentSearch.state.page}
              rowsPerPage={apartmentSearch.state.rowsPerPage}
              onPageChange={apartmentSearch.handlePageChange}
              onRowsPerPageChange={apartmentSearch.handleRowsPerPageChange}
              baseUrl="/dashboard/apartments"
              columns={[
                { key: 'cover_image', label: t('apartments.lblCoverImage') },
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
