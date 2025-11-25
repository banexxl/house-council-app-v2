'use client';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { tokens } from 'src/locales/tokens';

export const ProfileNotFoundNotice = () => {
  const { t } = useTranslation();

  return (
    <Stack spacing={1}>
      <Typography variant="h4" gutterBottom>
        {t(tokens.tenants.socialProfileNotFoundTitle)}
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        {t(tokens.tenants.socialProfileNotFoundDescription)}
      </Typography>
    </Stack>
  );
};
