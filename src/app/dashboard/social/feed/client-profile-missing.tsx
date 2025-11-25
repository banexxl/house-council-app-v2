'use client';

import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { tokens } from 'src/locales/tokens';

export const FeedProfileMissing = () => {
  const { t } = useTranslation();

  return (
    <Typography variant="body1" sx={{ mb: 4 }}>
      {t(tokens.tenants.socialProfileNotFoundDescription)}
    </Typography>
  );
};
