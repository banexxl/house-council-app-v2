import type { NextPage } from 'next';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { BreadcrumbsSeparator } from 'src/components/breadcrumbs-separator';
import { RouterLink } from 'src/components/router-link';
import { Seo } from 'src/components/seo';
import { usePageView } from 'src/hooks/use-page-view';
import { Layout as DashboardLayout } from 'src/layouts/dashboard';
import { paths } from 'src/paths';
import { BuildingApartmentCreateForm } from '@/sections/dashboard/building-apartments/building-apartments-create-form';
import { buildingServices } from '@/utils/building-services';

const Page: NextPage = (props: any) => {
          usePageView();

          return (
                    <>
                              <Seo title="Dashboard: Building Create" />
                              <Box
                                        component="main"
                                        sx={{
                                                  flexGrow: 1,
                                                  py: 8,
                                        }}
                              >
                                        <Container maxWidth="xl">
                                                  <Stack spacing={3}>
                                                            <Stack spacing={1}>
                                                                      <Typography variant="h4">Add a new apartment</Typography>
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
                                                                                          Apartments
                                                                                </Link>
                                                                                <Typography
                                                                                          color="text.secondary"
                                                                                          variant="subtitle2"
                                                                                >
                                                                                          Create
                                                                                </Typography>
                                                                      </Breadcrumbs>
                                                            </Stack>
                                                            <BuildingApartmentCreateForm allBuildings={props.allBuildings} />
                                                  </Stack>
                                        </Container>
                              </Box>
                    </>
          );
};

export const getServerSideProps = async (context: any) => {

          const allBuildings = await buildingServices().getAllBuildings()

          redirect: {
                    destination: "/404"
          }

          return {
                    props: {
                              allBuildings: JSON.parse(JSON.stringify(allBuildings)),
                    },
          }

}

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
