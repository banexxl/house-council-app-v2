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
import { Seo } from 'src/components/seo';
import { paths } from 'src/paths';
import { BuildingListSearch } from 'src/sections/dashboard/buildings/building-list-search';
import { BuildingListTable } from 'src/sections/dashboard/buildings/building-list-table';
import type { Building } from 'src/types/building';

interface Filters {
  name?: string;
  category: string[];
  status: string[];
  inStock?: boolean;
}

interface BuildingsSearchState {
  filters: Filters;
  page: number;
  rowsPerPage: number;
}

const useBuildingsSearch = () => {
  const [state, setState] = useState<BuildingsSearchState>({
    filters: {
      name: undefined,
      category: [],
      status: [],
      inStock: undefined,
    },
    page: 0,
    rowsPerPage: 5,
  });

  const handleFiltersChange = useCallback((filters: Filters): void => {
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
};

const Buildings = ({ clientBuildings }: BuildingTableProps) => {
  const buildingSearch = useBuildingsSearch();

  // Optional: filter logic here, if needed
  const filteredBuildings = useMemo(() => {
    const { name } = buildingSearch.state.filters;

    return clientBuildings.filter((building) =>
      name ? building.building_location?.street_address.toLowerCase().includes(name.toLowerCase()) : true
    );
  }, [clientBuildings, buildingSearch.state.filters]);

  const paginatedBuildings = useMemo(() => {
    const start = buildingSearch.state.page * buildingSearch.state.rowsPerPage;
    const end = start + buildingSearch.state.rowsPerPage;
    return filteredBuildings.slice(start, end);
  }, [filteredBuildings, buildingSearch.state.page, buildingSearch.state.rowsPerPage]);

  return (
    <>
      <Seo title="Dashboard: Building List" />
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={4}>
            <Stack direction="row" justifyContent="space-between" spacing={4}>
              <Stack spacing={1}>
                <Typography variant="h4">Buildings</Typography>
                <Breadcrumbs separator={<BreadcrumbsSeparator />}>
                  <Link color="text.primary" component={RouterLink} href={paths.dashboard.index} variant="subtitle2">
                    Dashboard
                  </Link>
                  <Link color="text.primary" component={RouterLink} href={paths.dashboard.products.index} variant="subtitle2">
                    Buildings
                  </Link>
                  <Typography color="text.secondary" variant="subtitle2">
                    List
                  </Typography>
                </Breadcrumbs>
              </Stack>
              <Button
                component={RouterLink}
                href={paths.dashboard.buildings.new}
                startIcon={
                  <SvgIcon>
                    <PlusIcon />
                  </SvgIcon>
                }
                variant="contained"
              >
                Add
              </Button>
            </Stack>

            <Card>
              <BuildingListSearch onFiltersChange={buildingSearch.handleFiltersChange} />
              <BuildingListTable
                items={paginatedBuildings}
                count={filteredBuildings.length}
                page={buildingSearch.state.page}
                rowsPerPage={buildingSearch.state.rowsPerPage}
                onPageChange={buildingSearch.handlePageChange}
                onRowsPerPageChange={buildingSearch.handleRowsPerPageChange}
              />
            </Card>
          </Stack>
        </Container>
      </Box>
    </>
  );
};

export default Buildings;
