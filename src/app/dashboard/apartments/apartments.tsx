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
  Typography
} from '@mui/material';

import { BreadcrumbsSeparator } from 'src/components/breadcrumbs-separator';
import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import { useTranslation } from 'react-i18next';
import { apartmentStatusMap, apartmentTypeMap, type Apartment } from 'src/types/apartment';
import { ApartmentListTable } from 'src/sections/dashboard/apartments/apartment-list-table';
import { ApartmentListSearch } from 'src/sections/dashboard/apartments/apartment-list-search';

export interface ApartmentFilters {
  apartment_number?: string;
  apartment_statuses: string[];
  apartment_types: string[];
}

export interface ApartmentsSearchState {
  filters: ApartmentFilters;
  page: number;
  rowsPerPage: number;
}

const useApartmentsSearch = () => {

  const [state, setState] = useState<ApartmentsSearchState>({
    filters: {
      apartment_number: undefined,
      apartment_statuses: [],
      apartment_types: [],
    },
    page: 0,
    rowsPerPage: 5,
  });

  const handleFiltersChange = useCallback((filters: ApartmentFilters): void => {
    setState((prev) => ({ ...prev, filters, page: 0 }));
  }, []);

  const handlePageChange = useCallback((_event: MouseEvent<HTMLButtonElement> | null, page: number): void => {
    setState((prev) => ({ ...prev, page }));
  }, []);

  const handleRowsPerPageChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setState((prev) => ({
      ...prev,
      rowsPerPage: parseInt(event.target.value, 10),
      page: 0,
    }));
  }, []);

  return { state, handleFiltersChange, handlePageChange, handleRowsPerPageChange };
};

interface ApartmentsProps {
  apartments: Apartment[];
}

const Apartments = ({ apartments }: ApartmentsProps) => {
  const { t } = useTranslation();
  const apartmentSearch = useApartmentsSearch();
  const [addApartmentLoading, setAddApartmentLoading] = useState(false);

  const filteredApartments = useMemo(() => {
    const { apartment_number, apartment_statuses, apartment_types } = apartmentSearch.state.filters;

    return apartments.filter((apartment) => {

      const matchesNumber = apartment_number
        ? apartment.apartment_number?.toLowerCase().includes(apartment_number.toLowerCase())
        : true;

      const matchesType = apartment_types.length
        ? apartment_types.includes(apartmentTypeMap[apartment.apartment_type as keyof typeof apartmentTypeMap] || '')
        : true;

      const matchesStatus = apartment_statuses.length
        ? apartment_statuses.includes(apartmentStatusMap[apartment.apartment_status as keyof typeof apartmentStatusMap] || '')
        : true;

      return matchesNumber && matchesType && matchesStatus;
    });
  }, [apartments, apartmentSearch.state.filters]);


  const paginatedApartments = useMemo(() => {
    const start = apartmentSearch.state.page * apartmentSearch.state.rowsPerPage;
    const end = start + apartmentSearch.state.rowsPerPage;
    return filteredApartments.slice(start, end);
  }, [filteredApartments, apartmentSearch.state.page, apartmentSearch.state.rowsPerPage]);

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="xl">
        <Stack spacing={4}>
          <Stack direction="row" justifyContent="space-between" spacing={4}>
            <Stack spacing={1}>
              <Typography variant="h4">{t('apartments.apartmentList')}</Typography>
              <Breadcrumbs separator={<BreadcrumbsSeparator />}>
                <Link color="text.primary" component={RouterLink} href={paths.dashboard.index} variant="subtitle2">
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
              startIcon={<SvgIcon><PlusIcon /></SvgIcon>}
              variant="contained"
              loading={addApartmentLoading}
            >
              {t('common.btnCreate')}
            </Button>
          </Stack>

          <Card>
            <ApartmentListSearch onFiltersChange={apartmentSearch.handleFiltersChange} />
            <ApartmentListTable
              items={paginatedApartments}
              count={filteredApartments.length}
              page={apartmentSearch.state.page}
              rowsPerPage={apartmentSearch.state.rowsPerPage}
              onPageChange={apartmentSearch.handlePageChange}
              onRowsPerPageChange={apartmentSearch.handleRowsPerPageChange}
            />
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default Apartments;
