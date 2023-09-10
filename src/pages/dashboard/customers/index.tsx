import type { ChangeEvent, MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NextPage } from 'next';
import Download01Icon from '@untitled-ui/icons-react/build/esm/Download01';
import PlusIcon from '@untitled-ui/icons-react/build/esm/Plus';
import Upload01Icon from '@untitled-ui/icons-react/build/esm/Upload01';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import { Seo } from 'src/components/seo';
import { useMounted } from 'src/hooks/use-mounted';
import { usePageView } from 'src/hooks/use-page-view';
import { useSelection } from 'src/hooks/use-selection';
import { Layout as DashboardLayout } from 'src/layouts/dashboard';
import { CustomerListSearch } from 'src/sections/dashboard/customer/customer-list-search';
import { CustomerListTable } from 'src/sections/dashboard/customer/customer-list-table';
import type { Customer } from 'src/types/customer';
import { GetServerSideProps } from 'next/types';
import Link from 'next/link';
import { paths } from '@/paths';
import { RouterLink } from '@/components/router-link';
import { MongoClient } from 'mongodb';

interface Filters {
          query?: string;
          hasAcceptedMarketing?: boolean;
          isProspect?: boolean;
          isReturning?: boolean;
}

interface CustomersSearchState {
          filters: Filters;
          page: number;
          rowsPerPage: number;
          sortBy: string;
          sortDir: 'asc' | 'desc';
}

interface CustomersStoreState {
          customers: Customer[];
          customersCount: number;
}


const Page: NextPage = (props: any) => {

          const useCustomersSearch = () => {
                    const [state, setState] = useState<CustomersSearchState>({
                              filters: {
                                        query: undefined,
                                        hasAcceptedMarketing: undefined,
                                        isProspect: undefined,
                                        isReturning: undefined,
                              },
                              page: 0,
                              rowsPerPage: 5,
                              sortBy: 'updatedAt',
                              sortDir: 'desc',
                    });

                    const handleFiltersChange = useCallback((filters: Filters): void => {
                              setState((prevState) => ({
                                        ...prevState,
                                        filters,
                              }));
                    }, []);

                    const handleSortChange = useCallback(
                              (sort: { sortBy: string; sortDir: 'asc' | 'desc' }): void => {
                                        setState((prevState) => ({
                                                  ...prevState,
                                                  sortBy: sort.sortBy,
                                                  sortDir: sort.sortDir,
                                        }));
                              },
                              []
                    );

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
                              handleSortChange,
                              handlePageChange,
                              handleRowsPerPageChange,
                              state,
                    };
          };

          const useCustomersStore = (searchState: CustomersSearchState) => {
                    const isMounted = useMounted();
                    const [state, setState] = useState<CustomersStoreState>({
                              customers: [],
                              customersCount: 0,
                    });

                    const handleCustomersGet = useCallback(async () => {
                              try {
                                        if (isMounted()) {
                                                  setState({
                                                            customers: props.allTenants,
                                                            customersCount: props.allTenants.length,
                                                  });
                                        }
                              } catch (err) {
                                        console.error(err);
                              }
                    }, [isMounted]);

                    useEffect(
                              () => {
                                        handleCustomersGet();
                              },
                              // eslint-disable-next-line react-hooks/exhaustive-deps
                              [searchState]
                    );

                    return {
                              ...state,
                    };
          };

          const useCustomersIds = (customers: Customer[] = []) => {
                    return useMemo(() => {
                              return props.allTenants.map((tenant: any) => tenant._id);
                    }, []);
          };

          const customersSearch = useCustomersSearch();
          const customersStore = useCustomersStore(customersSearch.state);
          const customersIds = useCustomersIds(customersStore.customers);
          const customersSelection = useSelection<string>(customersIds);

          usePageView();

          return (
                    <>
                              <Seo title="Dashboard: Customer List" />
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
                                                                                <Typography variant="h4">Customers</Typography>
                                                                                <Stack
                                                                                          alignItems="center"
                                                                                          direction="row"
                                                                                          spacing={1}
                                                                                >
                                                                                          <Button
                                                                                                    color="inherit"
                                                                                                    size="small"
                                                                                                    startIcon={
                                                                                                              <SvgIcon>
                                                                                                                        <Upload01Icon />
                                                                                                              </SvgIcon>
                                                                                                    }
                                                                                          >
                                                                                                    Import
                                                                                          </Button>
                                                                                          <Button
                                                                                                    color="inherit"
                                                                                                    size="small"
                                                                                                    startIcon={
                                                                                                              <SvgIcon>
                                                                                                                        <Download01Icon />
                                                                                                              </SvgIcon>
                                                                                                    }
                                                                                          >
                                                                                                    Export
                                                                                          </Button>
                                                                                </Stack>
                                                                      </Stack>
                                                                      <Stack
                                                                                alignItems="center"
                                                                                direction="row"
                                                                                spacing={3}
                                                                      >
                                                                                <Button
                                                                                          component={RouterLink}
                                                                                          href={paths.dashboard.customers.create}
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
                                                                      <CustomerListSearch
                                                                                onFiltersChange={customersSearch.handleFiltersChange}
                                                                                onSortChange={customersSearch.handleSortChange}
                                                                                sortBy={customersSearch.state.sortBy}
                                                                                sortDir={customersSearch.state.sortDir}
                                                                      />
                                                                      <CustomerListTable
                                                                                count={customersStore.customersCount}
                                                                                items={customersStore.customers}
                                                                                onDeselectAll={customersSelection.handleDeselectAll}
                                                                                onDeselectOne={customersSelection.handleDeselectOne}
                                                                                onPageChange={customersSearch.handlePageChange}
                                                                                onRowsPerPageChange={customersSearch.handleRowsPerPageChange}
                                                                                onSelectAll={customersSelection.handleSelectAll}
                                                                                onSelectOne={customersSelection.handleSelectOne}
                                                                                page={customersSearch.state.page}
                                                                                rowsPerPage={customersSearch.state.rowsPerPage}
                                                                                selected={customersSelection.selected}
                                                                      />
                                                            </Card>
                                                  </Stack>
                                        </Container>
                              </Box>
                    </>
          );
};

type ConnectionStatus = {
          isConnected: boolean
}

export const getServerSideProps: GetServerSideProps<ConnectionStatus> = async () => {

          try {
                    const mongoClient = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!, {})
                    const mongoDB = mongoClient.db("HouseCouncilAppDB")
                    const allTenants = await mongoDB.collection("Tenants").find({}).toArray()

                    return {
                              props: {
                                        isConnected: true,
                                        allTenants: JSON.parse(JSON.stringify(allTenants))
                              },
                    }
          } catch (e) {
                    console.error(e)
                    return {
                              props: { isConnected: false },
                    }
          }
}

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
