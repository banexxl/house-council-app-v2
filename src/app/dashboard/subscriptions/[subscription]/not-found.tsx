'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles/createTheme';

import { Seo } from 'src/components/seo';

import { paths } from 'src/paths';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { useState } from 'react';

export default function NotFound() {

  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  return (
    <>
      <Seo title={t('errors.page.notFound')} />
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
              alt={t('errors.page.notFound')}
              component="img"
              src="/assets/errors/error-404.png"
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
            404: {t('errors.page.notFoundDescriptionShort')}
          </Typography>
          <Typography
            align="center"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            {t('errors.page.notFoundDescription')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mt: 6,
            }}
          >
            <Button
              onClick={() => {
                router.push(paths.index)
                setLoading(true)
              }}
              loading={loading}
            >
              {t('common.btnBackHome')}
            </Button>
          </Box>
        </Container>
      </Box>
    </>
  );
}
