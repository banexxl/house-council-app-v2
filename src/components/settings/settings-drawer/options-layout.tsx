import type { FC, ReactElement } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { Logo } from 'src/components/logo';
import type { Layout } from 'src/types/settings';

interface Option {
  label: string;
  value: Layout;
  icon: ReactElement;
}

const options: Option[] = [
  {
    label: 'settings.layout.vertical',
    value: 'vertical',
    icon: (
      <Box
        sx={{
          display: 'flex',
          flex: '1 1 auto',
        }}
      >
        <Box
          sx={{
            borderRightColor: (theme) =>
              theme.palette.mode === 'dark' ? 'neutral.500' : 'neutral.300',
            borderRightStyle: 'dashed',
            borderRightWidth: 1,
            px: 1,
            py: 0.5,
          }}
        >
          <Stack spacing={1}>
            <Logo url='/assets/logo-icons/1-01.png' alt='/assets/no-image.png' height={40} width={40} />
            <Box
              sx={{
                backgroundColor: 'primary.main',
                borderRadius: '2px',
                height: 4,
                width: 26,
              }}
            />
            <Box
              sx={{
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'neutral.600' : 'neutral.300',
                borderRadius: '2px',
                height: 4,
                width: 26,
              }}
            />
            <Box
              sx={{
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'neutral.600' : 'neutral.300',
                borderRadius: '2px',
                height: 4,
                width: 26,
              }}
            />
          </Stack>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flex: '1 1 auto',
            p: 1,
          }}
        >
          <Box
            sx={{
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark' ? 'neutral.800' : 'neutral.50',
              borderColor: (theme) =>
                theme.palette.mode === 'dark' ? 'neutral.500' : 'neutral.300',
              borderRadius: 1,
              borderStyle: 'dashed',
              borderWidth: 1,
              flex: '1 1 auto',
            }}
          />
        </Box>
      </Box>
    ),
  },
  {
    label: 'settings.layout.horizontal',
    value: 'horizontal',
    icon: (
      <Box
        sx={{
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            borderBottomColor: (theme) =>
              theme.palette.mode === 'dark' ? 'neutral.500' : 'neutral.300',
            borderBottomStyle: 'dashed',
            borderBottomWidth: 1,
            px: 1,
          }}
        >
          <Stack
            alignItems="center"
            direction="row"
            spacing={1}
          >
            <Logo url='/assets/logo-icons/1-01.png' alt='/assets/no-image.png' height={40} width={40} />
            <Box
              sx={{
                backgroundColor: 'primary.main',
                borderRadius: '2px',
                height: 4,
                width: 16,
              }}
            />
            <Box
              sx={{
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'neutral.600' : 'neutral.300',
                borderRadius: '2px',
                height: 4,
                width: 16,
              }}
            />
            <Box
              sx={{
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'neutral.600' : 'neutral.300',
                borderRadius: '2px',
                height: 4,
                width: 16,
              }}
            />
          </Stack>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flex: '1 1 auto',
            p: 1,
          }}
        >
          <Box
            sx={{
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark' ? 'neutral.800' : 'neutral.50',
              borderColor: (theme) =>
                theme.palette.mode === 'dark' ? 'neutral.500' : 'neutral.300',
              borderRadius: 1,
              borderStyle: 'dashed',
              borderWidth: 1,
              flex: '1 1 auto',
            }}
          />
        </Box>
      </Box>
    ),
  },
];

interface OptionsLayoutProps {
  onChange?: (value: Layout) => void;
  value?: Layout;
}

export const OptionsLayout: FC<OptionsLayoutProps> = (props) => {
  const { onChange, value } = props;
  const { t } = useTranslation();

  return (
    <Stack spacing={1}>
      <Typography
        color="text.secondary"
        variant="overline"
      >
        {t('settings.layout.label')}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: 'repeat(2, minmax(0, 140px))',
        }}
      >
        {options.map((option) => (
          <Stack
            key={option.value}
            spacing={1}
          >
            <Box
              onClick={() => onChange?.(option.value)}
              sx={{
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'neutral.900' : 'background.paper',
                borderColor: 'divider',
                borderRadius: 1,
                borderStyle: 'solid',
                borderWidth: 2,
                cursor: 'pointer',
                display: 'flex',
                height: 88,
                ...(option.value === value && {
                  borderColor: 'primary.main',
                }),
              }}
            >
              {option.icon}
            </Box>
            <Typography
              align="center"
              sx={{ fontWight: 500 }}
              variant="body2"
            >
              {t(option.label)}
            </Typography>
          </Stack>
        ))}
      </Box>
    </Stack>
  );
};

OptionsLayout.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.oneOf(['horizontal', 'vertical']),
};
