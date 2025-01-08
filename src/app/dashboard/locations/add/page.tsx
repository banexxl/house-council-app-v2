'use client';

import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';

import { BreadcrumbsSeparator } from 'src/components/breadcrumbs-separator';
import { RouterLink } from 'src/components/router-link';
import { Seo } from 'src/components/seo';

import { paths } from 'src/paths';
import LocationCreateForm from 'src/sections/dashboard/locations/location-create-form';

const Page = () => {

     const { t } = useTranslation();

     return (
          <>
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
                                   <Typography variant="h4">{t('locations.locationCreate')}</Typography>
                                   <Breadcrumbs separator={<BreadcrumbsSeparator />}>
                                        <Link
                                             color="text.primary"
                                             component={RouterLink}
                                             href={paths.dashboard.index}
                                             variant="subtitle2"
                                        >
                                             {t('nav.dashboard')}
                                        </Link>
                                        <Link
                                             color="text.primary"
                                             component={RouterLink}
                                             href={paths.dashboard.locations.index}
                                             variant="subtitle2"
                                        >
                                             {t('nav.locations')}
                                        </Link>
                                        <Typography
                                             color="text.secondary"
                                             variant="subtitle2"
                                        >
                                             {t('locations.locationCreate')}
                                        </Typography>
                                   </Breadcrumbs>
                              </Stack>
                              <LocationCreateForm />
                         </Stack>
                    </Container>
               </Box>
          </>
     );
};

export default Page;
