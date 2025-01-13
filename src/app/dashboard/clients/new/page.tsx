'use client';

import { useCallback, useEffect, useState } from 'react';
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

import { paths } from 'src/paths';
import { ClientNewForm } from 'src/sections/dashboard/client/client-new-form';
import type { Client } from 'src/types/client';
import { getInitials } from 'src/utils/get-initials';
import { useTranslation } from 'react-i18next';

const Page = () => {

  const { t } = useTranslation()

  return (
    <>
      <Seo title="Dashboard: Client Edit" />
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
                  href={paths.dashboard.clients.index}
                  sx={{
                    alignItems: 'center',
                    display: 'inline-flex',
                  }}
                  underline="hover"
                >
                  <SvgIcon sx={{ mr: 1 }}>
                    <ArrowLeftIcon />
                  </SvgIcon>
                  <Typography variant="subtitle2">{t('clients.clientsList')}</Typography>
                </Link>
              </div>
            </Stack>
            <ClientNewForm />
          </Stack>
        </Container>
      </Box>
    </>
  );
};

export default Page;
