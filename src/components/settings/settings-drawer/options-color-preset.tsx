import type { FC } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import type { ColorPreset } from 'src/theme';
import { blue, green, indigo, purple, red, teal, orange } from 'src/theme/colors';

interface Option {
  label: string;
  value: ColorPreset;
  color: string;
}

interface OptionsColorPresetProps {
  onChange?: (value: ColorPreset) => void;
  value?: ColorPreset;
}

export const OptionsColorPreset: FC<OptionsColorPresetProps> = (props) => {
  const { onChange, value } = props;
  const { t } = useTranslation();

  const options: Option[] = [
    { label: 'settings.colorPreset.orange', value: 'orange', color: orange.main },
    { label: 'settings.colorPreset.green', value: 'green', color: green.main },
    { label: 'settings.colorPreset.blue', value: 'blue', color: blue.main },
    { label: 'settings.colorPreset.indigo', value: 'indigo', color: indigo.main },
    { label: 'settings.colorPreset.purple', value: 'purple', color: purple.main },
    { label: 'settings.colorPreset.teal', value: 'teal', color: teal.main },
    { label: 'settings.colorPreset.red', value: 'red', color: red.main }
  ];

  return (
    <Stack spacing={1}>
      <Typography
        color="text.secondary"
        variant="overline"
      >
        {t('settings.colorPreset.label')}
      </Typography>
      <Stack
        alignItems="center"
        direction="row"
        flexWrap="wrap"
        gap={2}
      >
        {options.map((option) => (
          <Chip
            icon={
              <Box
                sx={{
                  backgroundColor: option.color,
                  borderRadius: '50%',
                  flexShrink: 0,
                  height: 24,
                  width: 24,
                }}
              />
            }
            key={option.value}
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
              width: '100px',
            }}
          />
        ))}
      </Stack>
    </Stack>
  );
};

OptionsColorPreset.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.oneOf(['blue', 'green', 'indigo', 'purple', 'teal', 'red', 'orange']),
};
