import type { FC } from 'react';
import PropTypes from 'prop-types';
import ChevronDownIcon from '@untitled-ui/icons-react/build/esm/ChevronDown';
import type { SxProps } from '@mui/system/styleFunctionSx';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import { keyframes, useTheme } from '@mui/material/styles';
import { usePopover } from 'src/hooks/use-popover';

import { TenantPopover } from './tenant-popover';
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';

interface TenantSwitchProps {
  sx?: SxProps;
}

export const TenantSwitch: FC<TenantSwitchProps> = (props) => {

  const popover = usePopover<HTMLButtonElement>();
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <>
      <Stack
        alignItems="center"
        direction="row"
        spacing={2}
        {...props}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography
            variant='h5'
            sx={{
              cursor: 'pointer',
              fontWeight: 'fontWeightBold',
              '&:hover': {
                color: theme.palette.primary.main,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '-200%',
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(to right, rgba(255, 80, 80, 0) 0%,${theme.palette.primary.main} 50%, rgba(255,255,255,0) 100%)`,
                  transform: 'skewX(-25deg)',
                  animation: 'shine 1.2s',
                },
              },
              '&:focus': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: '2px',
              },
              '@keyframes shine': {
                '100%': {
                  left: '150%',
                },
              },
            }}
          >
            {t(tokens.common.title)}
          </Typography>
          {/* <Typography
            color="neutral.400"
            variant="body2"
          >
            Production
          </Typography> */}
        </Box>
        {/* <IconButton
          onClick={popover.handleOpen}
          ref={popover.anchorRef}
        >
          <SvgIcon sx={{ fontSize: 16 }}>
            <ChevronDownIcon />
          </SvgIcon>
        </IconButton> */}
      </Stack>
      {/* <TenantPopover
        anchorEl={popover.anchorRef.current}
        onChange={popover.handleClose}
        onClose={popover.handleClose}
        open={popover.open}
        tenants={tenants}
      /> */}
    </>
  );
};

TenantSwitch.propTypes = {
  // @ts-ignore
  sx: PropTypes.object,
};
