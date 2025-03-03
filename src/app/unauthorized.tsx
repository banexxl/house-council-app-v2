'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles/createTheme';

import { Seo } from 'src/components/seo';

import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/router';
import { paths } from 'src/paths';
import { LoadingButton } from '@mui/lab';
import { useState } from 'react';

export default function Unauthorized() {

  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const { t } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  return (
    <>
      <Seo title={t('errors.authentification.loginError')} />
      <Box
        component="main"
        sx={{
          alignItems: 'center',
          display: 'flex',
          flexGrow: 1,
          py: '80px',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 6,
            }}
          >
            <Box
              alt={t('errors.authentification.loginError')}
              component="img"
              src="/assets/errors/error-401.png"
              sx={{
                height: 'auto',
                maxWidth: '100%',
                width: 400,
              }}
            />
          </Box>
          <Typography
            align="center"
            variant={mdUp ? 'h1' : 'h4'}
          >
            401: {t('errors.authentification.loginErrorDescriptionShort')}
          </Typography>
          <Typography
            align="center"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            {t('errors.authentification.loginErrorDescription')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mt: 6,
            }}
          >
            <LoadingButton
              onClick={() => {
                router.push(paths.index)
                setLoading(true)
              }}
              loading={loading}
            >
              {t('common.btnBackHome')}
            </LoadingButton>
          </Box>
        </Container>
      </Box>
    </>
  );
}
