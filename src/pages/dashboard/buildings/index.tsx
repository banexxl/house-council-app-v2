import type { ChangeEvent, MouseEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
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
import { } from 'src/sections/dashboard/building/building-list-search';
import { BuildingListTable } from 'src/sections/dashboard/building/building-list-table';
import type { Building } from '@/types/building';

interface BuildingFilters {
          buildingCategory: string[];
          buildingDetails: string[];
}

interface BuildingSearchState {
          filters: BuildingFilters;
          page: number;
          rowsPerPage: number;
}

const useBuildingsSearch = () => {

          const [state, setState] = useState<BuildingSearchState>({
                    filters: {
                              buildingCategory: [],
                              buildingDetails: []
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

          const handlePageChange = useCallback(
                    (event: MouseEvent<HTMLButtonElement> | null, page: number): void => {
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

const useBuildingsStore = (searchState: BuildingSearchState) => {
          const isMounted = useMounted();
          const [state, setState] = useState<BuildingStoreState>({
                    buildings: [],
                    buildingsCount: 0,
          });

          const handleBuildingsGet = useCallback(async () => {
                    try {

                              const response = await buildingsApi.getBuildings(searchState);

                              if (isMounted()) {
                                        setState({
                                                  buildings: response.data,
                                                  buildingsCount: response.count,
                                        });
                              }
                    } catch (err) {
                              console.error(err);
                    }
          }, [searchState, isMounted]);

          useEffect(
                    () => {
                              handleBuildingsGet();
                    },
                    // eslint-disable-next-line react-hooks/exhaustive-deps
                    [searchState]
          );

          return {
                    ...state,
          };
};

const Page: NextPage = () => {
          const buildingsSearch = useBuildingsSearch();
          const buildingsStore = useBuildingsStore(buildingsSearch.state);

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
                                                                                <Typography variant="h4">Buildings</Typography>
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
                                                                                                    href={paths.dashboard.buildings.index}
                                                                                                    variant="subtitle2"
                                                                                          >
                                                                                                    Buildings
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
                                                                                          href={paths.dashboard.buildings.create}
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
                                                                      <BuildingListSearch onFiltersChange={buildingsSearch.handleFiltersChange} />
                                                                      <BuildingListTable
                                                                                onPageChange={buildingsSearch.handlePageChange}
                                                                                onRowsPerPageChange={buildingsSearch.handleRowsPerPageChange}
                                                                                page={buildingsSearch.state.page}
                                                                                items={buildingsStore.buildings}
                                                                                count={buildingsStore.buildingsCount}
                                                                                rowsPerPage={buildingsSearch.state.rowsPerPage}
                                                                      />
                                                            </Card>
                                                  </Stack>
                                        </Container>
                              </Box>
                    </>
          );
};

export const getStaticProps = (async (context: any) => {

          const res = await fetch('https://api.github.com/repos/vercel/next.js')
          const repo = await res.json()
          return { props: { repo } }

})

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
