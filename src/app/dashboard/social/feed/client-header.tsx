'use client';

import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { tokens } from 'src/locales/tokens';

export const FeedPageHeader = () => {
  const { t } = useTranslation();

  return (
    <Stack spacing={1}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 0.5 }}>
        <Link color="inherit" href="/dashboard">
          {t(tokens.nav.adminDashboard)}
        </Link>
        <Typography color="text.primary">{t(tokens.tenants.socialFeedTitle)}</Typography>
      </Breadcrumbs>
      <Typography variant="h4">{t(tokens.tenants.socialFeedHeading)}</Typography>
    </Stack>
  );
};
