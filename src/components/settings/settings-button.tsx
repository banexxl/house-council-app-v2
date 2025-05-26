import type { FC } from 'react';
import PropTypes from 'prop-types';
import Settings03Icon from '@untitled-ui/icons-react/build/esm/Settings03';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import SvgIcon from '@mui/material/SvgIcon';
import Tooltip from '@mui/material/Tooltip';
import { usePathname } from 'next/navigation';

interface SettingsButtonProps {
  onClick?: () => void;
}

export const SettingsButton: FC<SettingsButtonProps> = (props) => {
  const pathname = usePathname();

  // Disable the button if on the specified URL
  const isDisabled = pathname === '/dashboard/locations/add' || pathname === '/auth/login';

  return (
    <Tooltip title="Settings">
      <Box
        sx={{
          backgroundColor: 'background.paper',
          borderRadius: '50%',
          bottom: 0,
          boxShadow: 16,
          margin: (theme) => theme.spacing(4),
          position: 'fixed',
          right: 0,
          zIndex: (theme) => theme.zIndex.speedDial,
        }}
      >
        <ButtonBase
          sx={{
            backgroundColor: isDisabled ? 'grey.500' : 'primary.main',
            borderRadius: '50%',
            color: isDisabled ? 'grey.300' : 'primary.contrastText',
            p: '10px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            pointerEvents: isDisabled ? 'none' : 'auto',
            display: pathname === '/dashboard/locations/add' || pathname === '/auth/login' ? 'none' : 'flex',
          }}
          disabled={isDisabled}
          onClick={!isDisabled ? props.onClick : undefined}
        >
          <SvgIcon>
            <Settings03Icon />
          </SvgIcon>
        </ButtonBase>
      </Box>
    </Tooltip>
  );
};

SettingsButton.propTypes = {
  onClick: PropTypes.func,
};
