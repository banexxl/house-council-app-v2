"use client"

import type { FC } from 'react';
import { useEffect, useState, useTransition } from 'react';
import PropTypes from 'prop-types';
import CreditCard01Icon from '@untitled-ui/icons-react/build/esm/CreditCard01';
import Settings04Icon from '@untitled-ui/icons-react/build/esm/Settings04';
import User03Icon from '@untitled-ui/icons-react/build/esm/User03';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Popover from '@mui/material/Popover';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/components/router-link';
import { useMockedUser } from 'src/hooks/use-mocked-user';
import { useRouter } from 'src/hooks/use-router';
import { paths } from 'src/paths';
import { logout } from 'src/app/auth/actions';
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';
import { User } from '@supabase/supabase-js';
import { Tooltip } from '@mui/material';

interface AccountPopoverProps {
  anchorEl: null | Element;
  onClose?: () => void;
  open?: boolean;
}

export const AccountPopover: FC<AccountPopoverProps> = (props) => {
  const { anchorEl, onClose, open, ...other } = props;
  const router = useRouter();
  const mockedUser = useMockedUser();
  const [user, setUser] = useState<User>();
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabaseBrowserClient.auth.getSession();
      setUser(data.session?.user);
    }
    getUser();
  }, []);

  const handleLogout = () => {
    startTransition(async () => {
      const { success, error } = await logout()
      if (success) {
        router.push(paths.auth.login)
      } else {
        console.error('Logout error:', error)
      }
    })
    onClose?.()
  }

  return (
    <Popover
      anchorEl={anchorEl}
      anchorOrigin={{
        horizontal: 'center',
        vertical: 'bottom',
      }}
      disableScrollLock
      onClose={onClose}
      open={!!open}
      PaperProps={{ sx: { width: 200 } }}
      {...other}
    >
      <Box sx={{ p: 2 }}>
        {/* <Typography variant="body1">{user?.}</Typography> */}
        <Tooltip title={user?.email}>
          <Typography
            color="text.secondary"
            variant="body2"
            noWrap
            sx={{ maxWidth: 180 }}
          >
            {user?.email?.slice(0, 20)}{user?.email && user.email.length > 20 ? '...' : ''}
          </Typography>
        </Tooltip>
      </Box>
      <Divider />
      <Box sx={{ p: 1 }}>
        <ListItemButton
          component={RouterLink}
          href={paths.dashboard.social.profile}
          onClick={onClose}
          sx={{
            borderRadius: 1,
            px: 1,
            py: 0.5,
          }}
        >
          <ListItemIcon>
            <SvgIcon fontSize="small">
              <User03Icon />
            </SvgIcon>
          </ListItemIcon>
          <ListItemText primary={<Typography variant="body1">Profile</Typography>} />
        </ListItemButton>
        <ListItemButton
          component={RouterLink}
          href={paths.dashboard.account}
          onClick={onClose}
          sx={{
            borderRadius: 1,
            px: 1,
            py: 0.5,
          }}
        >
          <ListItemIcon>
            <SvgIcon fontSize="small">
              <Settings04Icon />
            </SvgIcon>
          </ListItemIcon>
          <ListItemText primary={<Typography variant="body1">Settings</Typography>} />
        </ListItemButton>
        <ListItemButton
          component={RouterLink}
          href={paths.dashboard.index}
          onClick={onClose}
          sx={{
            borderRadius: 1,
            px: 1,
            py: 0.5,
          }}
        >
          <ListItemIcon>
            <SvgIcon fontSize="small">
              <CreditCard01Icon />
            </SvgIcon>
          </ListItemIcon>
          <ListItemText primary={<Typography variant="body1">Billing</Typography>} />
        </ListItemButton>
      </Box>
      <Divider sx={{ my: '0 !important' }} />
      <Box
        sx={{
          display: 'flex',
          p: 1,
          justifyContent: 'center',
        }}
      >
        <Button
          color="inherit"
          onClick={handleLogout}
          size="small"
          disabled={isPending}
        >
          {isPending ? 'Logging out...' : 'Logout'}
        </Button>
      </Box>
    </Popover>
  );
};

AccountPopover.propTypes = {
  anchorEl: PropTypes.any,
  onClose: PropTypes.func,
  open: PropTypes.bool,
};
