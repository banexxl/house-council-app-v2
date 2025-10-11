import type { FC } from 'react';
import PropTypes from 'prop-types';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import type { NavColor } from 'src/types/settings';

interface Option {
  label: string;
  value: NavColor;
}

const options: Option[] = [
  {
    label: 'settings.navColor.blendIn',
    value: 'blend-in',
  },
  {
    label: 'settings.navColor.discrete',
    value: 'discrete',
  },
  {
    label: 'settings.navColor.evident',
    value: 'evident',
  },
];

interface OptionsNavColorProps {
  onChange?: (value: NavColor) => void;
  value?: NavColor;
}

export const OptionsNavColor: FC<OptionsNavColorProps> = (props) => {
  const { onChange, value } = props;
  const { t } = useTranslation();

  return (
    <Stack spacing={1}>
      <Typography
        color="text.secondary"
        variant="overline"
      >
        {t('settings.navColor.label')}
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

OptionsNavColor.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.oneOf(['blend-in', 'discrete', 'evident']),
};
