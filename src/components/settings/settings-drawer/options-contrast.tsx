import type { FC } from 'react';
import PropTypes from 'prop-types';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import type { Contrast } from 'src/theme';

interface Option {
  label: string;
  value: Contrast;
}

const options: Option[] = [
  {
    label: 'settings.contrast.normal',
    value: 'normal',
  },
  {
    label: 'settings.contrast.high',
    value: 'high',
  },
];

interface OptionsContrastProps {
  onChange?: (value: Contrast) => void;
  value?: Contrast;
}

export const OptionsContrast: FC<OptionsContrastProps> = (props) => {
  const { onChange, value } = props;
  const { t } = useTranslation();

  return (
    <Stack spacing={1}>
      <Typography
        color="text.secondary"
        variant="overline"
      >
        {t('settings.contrast.label')}
      </Typography>
      <Stack
        alignItems="center"
        direction="row"
        flexWrap="wrap"
        gap={2}
      >
        {options.map((option) => (
          <Chip
            key={option.label}
            label={t(option.label)}
            onClick={() => onChange?.(option.value)}
            sx={{
              borderColor: 'transparent',
              borderRadius: 1.5,
              borderStyle: 'solid',
              borderWidth: 2,
              ...(option.value === value && {
                borderColor: 'primary.main',
              }),
            }}
          />
        ))}
      </Stack>
    </Stack>
  );
};

OptionsContrast.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.oneOf(['normal', 'high']),
};
