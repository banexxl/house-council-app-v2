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
import type { Apartment } from 'src/types/apartment';
import { ApartmentListTable } from 'src/sections/dashboard/apartments/apartment-list-table';
import { ApartmentListSearch } from 'src/sections/dashboard/apartments/apartment-list-search';

interface ApartmentFilters {
  apartment_number?: string;
  types: string[];
  rentalStatuses: string[];
}

interface ApartmentsProps {
  apartments: Apartment[];
}

const Apartments = ({ apartments }: ApartmentsProps) => {

  const { t } = useTranslation();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [filters, setFilters] = useState<ApartmentFilters>({
    apartment_number: undefined,
    types: [],
    rentalStatuses: [],
  });

  const handleFiltersChange = useCallback((newFilters: ApartmentFilters) => {
    setFilters(newFilters);
    setPage(0); // Reset pagination on filter change
  }, []);

  const filteredApartments = useMemo(() => {
    return apartments.filter((apartment) => {
      const matchesNumber = filters.apartment_number
        ? apartment.apartment_number.toLowerCase().includes(filters.apartment_number.toLowerCase())
        : true;

      const matchesType = filters.types.length
        ? filters.types.includes(apartment.apartment_type || '')
        : true;

      const matchesRental = filters.rentalStatuses.length
        ? filters.rentalStatuses.includes(apartment.rental_status || '')
        : true;

      return matchesNumber && matchesType && matchesRental;
    });
  }, [apartments, filters]);

  const paginatedApartments = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredApartments.slice(start, end);
  }, [filteredApartments, page, rowsPerPage]);

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
              startIcon={
                <SvgIcon>
                  <PlusIcon />
                </SvgIcon>
              }
              variant="contained"
            >
              {t('common.btnCreate')}
            </Button>
          </Stack>

          <Card>
            <ApartmentListSearch onFiltersChange={handleFiltersChange} />
            <ApartmentListTable
              items={paginatedApartments}
              count={filteredApartments.length}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={(_event, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) =>
                setRowsPerPage(parseInt(event.target.value, 10))
              }
            />
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default Apartments;
