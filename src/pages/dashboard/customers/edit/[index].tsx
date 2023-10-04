import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import ArrowLeftIcon from '@untitled-ui/icons-react/build/esm/ArrowLeft';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import { RouterLink } from 'src/components/router-link';
import { Seo } from 'src/components/seo';
import { useMounted } from 'src/hooks/use-mounted';
import { usePageView } from 'src/hooks/use-page-view';
import { Layout as DashboardLayout } from 'src/layouts/dashboard';
import { paths } from 'src/paths';
import { CustomerEditForm } from 'src/sections/dashboard/customer/customer-edit-form';
import { getInitials } from 'src/utils/get-initials';
import { MongoClient, ObjectId } from 'mongodb';

const Page: NextPage = (props: any) => {
          usePageView();
          console.log('customer edit props', props);

          if (!props.customer) {
                    return null;
          }

          return (
                    <>
                              <Seo title="Dashboard: Customer Edit" />
                              <Box
                                        component="main"
                                        sx={{
                                                  flexGrow: 1,
                                                  py: 8,
                                        }}
                              >
                                        <Container maxWidth="lg">
                                                  <Stack spacing={4}>
                                                            <Stack spacing={4}>
                                                                      <div>
                                                                                <Link
                                                                                          color="text.primary"
                                                                                          component={RouterLink}
                                                                                          href={paths.dashboard.customers.index}
                                                                                          sx={{
                                                                                                    alignItems: 'center',
                                                                                                    display: 'inline-flex',
                                                                                          }}
                                                                                          underline="hover"
                                                                                >
                                                                                          <SvgIcon sx={{ mr: 1 }}>
                                                                                                    <ArrowLeftIcon />
                                                                                          </SvgIcon>
                                                                                          <Typography variant="subtitle2">Customers</Typography>
                                                                                </Link>
                                                                      </div>
                                                                      <Stack
                                                                                alignItems="flex-start"
                                                                                direction={{
                                                                                          xs: 'column',
                                                                                          md: 'row',
                                                                                }}
                                                                                justifyContent="space-between"
                                                                                spacing={4}
                                                                      >
                                                                                <Stack
                                                                                          alignItems="center"
                                                                                          direction="row"
                                                                                          spacing={2}
                                                                                >
                                                                                          <Avatar
                                                                                                    src={props.customer.avatar}
                                                                                                    sx={{
                                                                                                              height: 64,
                                                                                                              width: 64,
                                                                                                    }}
                                                                                          >
                                                                                                    {getInitials(props.customer.firstName)}
                                                                                          </Avatar>
                                                                                          <Stack spacing={1}>
                                                                                                    <Typography variant="h4">{props.customer.email}</Typography>
                                                                                                    <Stack
                                                                                                              alignItems="center"
                                                                                                              direction="row"
                                                                                                              spacing={1}
                                                                                                    >
                                                                                                              <Typography variant="subtitle2">user_id:</Typography>
                                                                                                              <Chip
                                                                                                                        label={props.customer._id}
                                                                                                                        size="small"
                                                                                                              />
                                                                                                    </Stack>
                                                                                          </Stack>
                                                                                </Stack>
                                                                      </Stack>
                                                            </Stack>
                                                            <CustomerEditForm customer={props.customer} />
                                                  </Stack>
                                        </Container>
                              </Box>
                    </>
          );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export async function getServerSideProps(context: any) {

          const { resolvedUrl } = context
          const urlSplit = resolvedUrl.split('/');
          const customerID = urlSplit[4];

          const mongoClient = await MongoClient.connect(process.env.NEXT_PUBLIC_MONGO_DB_CONNECT!, {})
          const dbTenants = mongoClient.db('HouseCouncilAppDB').collection('Tenants')

          const customer: any = await dbTenants.findOne({ _id: new ObjectId(`${customerID}`) })


          // notFound: true -> ako vratimo ovo umesto ovog dole, vratice na 404 page tj not found page
          redirect: {
                    destination: "/404"
          }
          // mozemo da proverimo da li podaci uopste postoje, ako ne, mozemo da vratimo ovo, i da uradimo redirect na drugu stranicu
          // revalidate bi trebao da ponovo odradi getstaticprops logiku

          return {
                    props: {
                              customer: JSON.parse(JSON.stringify(customer)),
                    },
          }
}
export default Page;
