import type { ChangeEvent, MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NextPage } from 'next';
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
import { useMounted } from 'src/hooks/use-mounted';
import { usePageView } from 'src/hooks/use-page-view';
import { Layout as DashboardLayout } from 'src/layouts/dashboard';
import { paths } from 'src/paths';
import { BuildingListSearch } from 'src/sections/dashboard/buildings/building-list-search';
import { BuildingListTable } from 'src/sections/dashboard/buildings/building-list-table';
import type { Building, buildingAPIResponse } from '@/types/building';
import { BuildingFilters } from '@/sections/dashboard/buildings/building-options';
import { applyPagination } from '@/utils/apply-pagination';
import { useSelection } from '@/hooks/use-selection';
import { buildingServices } from '@/utils/building-services';
import { BuildingApartmentsListTable } from '@/sections/dashboard/building-apartments/building-apartments-list-table';
import { apartmentServices } from '@/utils/apartment-services';
import { BuildingApartment } from '@/types/building-appartment';
import { customersServices } from '@/utils/customer-services';

interface BuildingSearchState {
          filters: BuildingFilters;
          page: number;
          rowsPerPage: number;
}

const useBuildingsSearch = () => {

          const [state, setState] = useState<BuildingSearchState>({
                    filters: {
                              buildingAddress: '',
                              category: []
                    },
                    page: 0,
                    rowsPerPage: 5,
          });

          const handleFiltersChange = useCallback((filters: BuildingFilters): void => {
                    setState((prevState) => ({
                              ...prevState,
                              filters,
                    }));
          }, []);

          const handlePageChange = useCallback((event: MouseEvent<HTMLButtonElement> | null, page: number): void => {
                    setState((prevState) => ({
                              ...prevState,
                              page,
                    }));
          },
                    []
          );

          const handleRowsPerPageChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
                    setState((prevState) => ({
                              ...prevState,
                              rowsPerPage: parseInt(event.target.value, 10),
                    }));
          }, []);

          return {
                    handleFiltersChange,
                    handlePageChange,
                    handleRowsPerPageChange,
                    state,
          };
};

interface BuildingStoreState {
          buildings: Building[];
          buildingsCount: number;
}

const useBuildingApartment = (data: any, page: any, rowsPerPage: any) => {
          return useMemo(
                    () => {
                              return applyPagination(data, page, rowsPerPage);
                    },
                    [data, page, rowsPerPage]
          );
};

const useBuildingIds = (buildingApartments: any) => {
          return useMemo(
                    () => {
                              return buildingApartments.map((apartment: any) => apartment._id);
                    },
                    [buildingApartments]
          );
};

const Page: NextPage = (props: any) => {

          const [page, setPage] = useState(0);
          const [open, setOpen] = useState(false)
          const [openEdit, setOpenEdit] = useState(false)
          const [rowsPerPage, setRowsPerPage] = useState(5);
          const buildingApartments = useBuildingApartment(props.allAppartments, page, rowsPerPage);
          const buildingApartmentIDs = useBuildingIds(props.allAppartments);
          const buildingApartmentSelection = useSelection(buildingApartmentIDs);

          usePageView();

          return (
                    <>
                              <Seo title="Dashboard: Building List" />
                              <Box
                                        component="main"
                                        sx={{
                                                  flexGrow: 1,
                                                  py: 8,
                                        }}
                              >
                                        <Container maxWidth="xl">
                                                  <Stack spacing={4}>
                                                            <Stack
                                                                      direction="row"
                                                                      justifyContent="space-between"
                                                                      spacing={4}
                                                            >
                                                                      <Stack spacing={1}>
                                                                                <Typography variant="h4">Building apartments</Typography>
                                                                                <Breadcrumbs separator={<BreadcrumbsSeparator />}>
                                                                                          <Link
                                                                                                    color="text.primary"
                                                                                                    component={RouterLink}
                                                                                                    href={paths.dashboard.index}
                                                                                                    variant="subtitle2"
                                                                                          >
                                                                                                    Dashboard
                                                                                          </Link>
                                                                                          <Link
                                                                                                    color="text.primary"
                                                                                                    component={RouterLink}
                                                                                                    href={paths.dashboard.buildingApartments.index}
                                                                                                    variant="subtitle2"
                                                                                          >
                                                                                                    Building apartments
                                                                                          </Link>
                                                                                          <Typography
                                                                                                    color="text.secondary"
                                                                                                    variant="subtitle2"
                                                                                          >
                                                                                                    List
                                                                                          </Typography>
                                                                                </Breadcrumbs>
                                                                      </Stack>
                                                                      <Stack
                                                                                alignItems="center"
                                                                                direction="row"
                                                                                spacing={3}
                                                                      >
                                                                                <Button
                                                                                          component={RouterLink}
                                                                                          href={paths.dashboard.buildingApartments.create}
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
                                                            </Stack>
                                                            <Card>
                                                                      {/* <BuildingListSearch onFiltersChange={useBuildingsSearch().handleFiltersChange} /> */}
                                                                      <BuildingApartmentsListTable
                                                                                count={props.allAppartments.length}
                                                                                items={props.allAppartments}
                                                                                allOwners={props.allOwners}
                                                                                onPageChange={useBuildingsSearch().handlePageChange}
                                                                                onRowsPerPageChange={useBuildingsSearch().handleRowsPerPageChange}
                                                                                onDeselectOne={buildingApartmentSelection.handleDeselectOne}
                                                                                onSelectOne={buildingApartmentSelection.handleSelectOne}
                                                                                // onSelectAll={buildingSelection.handleSelectAll}
                                                                                page={page}
                                                                                rowsPerPage={rowsPerPage}
                                                                                selected={buildingApartmentSelection.selected as BuildingApartment[]}
                                                                      />
                                                            </Card>
                                                  </Stack>
                                        </Container>
                              </Box>
                    </>
          );
};

export const getServerSideProps = async (context: any) => {

          const allAppartments = await apartmentServices().getAllApartments()
          const allOwners = await customersServices().getAllOwners()

          redirect: {
                    destination: "/404"
          }

          return {
                    props: {
                              allAppartments: JSON.parse(JSON.stringify(allAppartments)),
                              allOwners: JSON.parse(JSON.stringify(allOwners)),
                    },
          }

}

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
