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
import { SignedAvatar } from 'src/components/signed-avatar';
import { useRouter } from 'src/hooks/use-router';
import { paths } from 'src/paths';
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';
import { Tooltip } from '@mui/material';
import { getViewer, UserDataCombined } from 'src/libs/supabase/server-auth';
import { useTranslation } from 'react-i18next';
import { useSettings } from 'src/hooks/use-settings';

interface AccountPopoverProps {
  anchorEl: null | Element;
  onClose?: () => void;
  open?: boolean;
}

export const AccountPopover: FC<AccountPopoverProps> = (props) => {
  const { anchorEl, onClose, open, ...other } = props;
  const router = useRouter();
  const [user, setUser] = useState<UserDataCombined>();
  const [isPending, startTransition] = useTransition()
  const { t } = useTranslation();
  const { handleDrawerOpen } = useSettings();

  useEffect(() => {
    const getUser = async () => {
      const userData = await getViewer();
      setUser(userData);
    }
    getUser();
  }, []);

  const handleLogout = () => {
    // Proactively unsubscribe from all realtime channels to avoid stale events after logout
    const channels = supabaseBrowserClient.getChannels?.() || [];
    if (channels.length) {
      Promise.all(channels.map(ch => supabaseBrowserClient.removeChannel(ch))).catch((e) => {
        console.warn('[realtime] channel cleanup error', e);
      });
    }

    startTransition(async () => {
      try {
        // Fire server action, but don't block UX on its internal cookie write details
        await supabaseBrowserClient.auth.signOut();
        router.refresh();
      } catch (err) {
        // Ig;nore server digest / cookie errors – session might already be gone
        console.warn('Logout server error (ignored):', err)
      } finally {
        // Always push to login; user is effectively logged out on this client
        router.push(paths.auth.login);
      }
    });

    onClose?.();
  };

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
      slotProps={{
        paper: {
          sx: {
            width: 300,
          },
        },
      }}
      {...other}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {user?.clientMember && (
          <SignedAvatar
            value={user.clientFromMember?.avatar}
            sx={{ width: 40, height: 40 }}
          />
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body1">{
            user?.clientMember ? <strong>{user.clientMember.name}</strong>
              : user?.admin ? <strong>{user.admin.first_name}</strong>
                : user?.client ? <strong>{user.client.name}</strong>
                  : user?.tenant ? <strong>{user.tenant.first_name + ' ' + user.tenant.last_name}</strong>
                    : <strong>User</strong>
          }</Typography>
          <Tooltip title={user?.clientMember?.email || user?.userData?.email || 'No email available'}>
            <Typography
              color="text.secondary"
              variant="body2"
              noWrap
              sx={{ maxWidth: 200 }}
            >
              {(user?.clientMember?.email || user?.userData?.email || '')?.slice(0, 24)}
              {(user?.clientMember?.email || user?.userData?.email || '').length > 24 ? '...' : ''}
            </Typography>
          </Tooltip>
        </Box>
      </Box>
      {!user?.clientMember && (
        <>
          <Divider />
          <Box sx={{ p: 1 }}>
            <ListItemButton
              component={RouterLink}
              href={user?.admin ? paths.dashboard.index
                : user?.client ? paths.dashboard.account
                  : user?.tenant ? paths.dashboard.social.profile
                    : paths.dashboard.index
              }
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
              <ListItemText primary={<Typography variant="body1">{t('nav.profile')}</Typography>} />
            </ListItemButton>
            <ListItemButton
              onClick={() => { handleDrawerOpen(); onClose?.(); }}
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
              <ListItemText primary={<Typography variant="body1">{t('common.settings')}</Typography>} />
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
              <ListItemText primary={<Typography variant="body1">{t('nav.billingInformation')}</Typography>} />
            </ListItemButton>
          </Box>
          <Divider sx={{ my: '0 !important' }} />
        </>
      )}
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
          {isPending ? t('common.loggingOut') : t('common.logout')}
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
