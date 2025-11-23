import type { FC } from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import Mail04Icon from '@untitled-ui/icons-react/build/esm/Mail04';
import XIcon from '@untitled-ui/icons-react/build/esm/X';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Scrollbar } from 'src/components/scrollbar';
import { Notification } from 'src/types/notification';
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';

const renderContent = (notification: Notification, t: (key: string) => string): JSX.Element | null => {
  const createdAt =
    typeof notification.created_at === 'string'
      ? new Date(notification.created_at)
      : notification.created_at;
  return (
    <ListItemText
      primary={
        <Typography variant="subtitle2" sx={{ mb: 0.25 }}>
          {t(notification.action_token)}
        </Typography>
      }
      secondary={
        <Typography variant="caption" color="text.secondary">
          • {format(createdAt, 'MMM dd, h:mm a')}
        </Typography>
      }
      sx={{ my: 0 }}
    />
  );
};

interface NotificationsPopoverProps {
  anchorEl: null | Element;
  notifications: Notification[];
  onClose?: () => void;
  onMarkAllAsRead?: () => void;
  onRemoveOne?: (id: string) => void;
  open?: boolean;
}

export const NotificationsPopover: FC<NotificationsPopoverProps> = (props) => {
  const {
    anchorEl,
    notifications,
    onClose,
    onMarkAllAsRead,
    onRemoveOne,
    open = false,
    ...other
  } = props;

  const isEmpty = notifications.length === 0;
  const { t } = useTranslation();

  return (
    <Popover
      anchorEl={anchorEl}
      anchorOrigin={{
        horizontal: 'left',
        vertical: 'bottom',
      }}
      disableScrollLock
      onClose={onClose}
      open={open}
      slotProps={{ paper: { sx: { width: 380 } } }}
      {...other}
    >
      <Stack
        alignItems="center"
        direction="row"
        justifyContent="space-between"
        spacing={2}
        sx={{
          px: 3,
          py: 2,
        }}
      >
        <Typography
          color="inherit"
          variant="h6"
        >
          {t(tokens.notifications.popoverTitle)}
        </Typography>
        <Tooltip title={t(tokens.notifications.markAllAsRead)}>
          <IconButton
            onClick={onMarkAllAsRead}
            size="small"
            color="inherit"
          >
            <SvgIcon>
              <Mail04Icon />
            </SvgIcon>
          </IconButton>
        </Tooltip>
      </Stack>
      {isEmpty ? (
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2">{t(tokens.notifications.none)}</Typography>
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Link href="/dashboard/notifications" underline="always" variant="body2">
              {t(tokens.notifications.viewAll)}
            </Link>
          </Box>
        </Box>
      ) : (
        <Scrollbar sx={{ maxHeight: 400 }}>
          <List disablePadding>
            {notifications.map((notification) => (
              <ListItem
                divider
                key={notification.id}
                component="a"
                href={notification.url}
                sx={{
                  alignItems: 'flex-start',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                  '& .MuiListItemSecondaryAction-root': {
                    top: '24%',
                  },
                  textDecoration: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                  '&:visited': {
                    color: 'inherit',
                  },
                }}
                secondaryAction={
                  <Tooltip title={t(tokens.notifications.remove)}>
                    <IconButton
                      edge="end"
                      onClick={() => onRemoveOne?.(notification.id!)}
                      size="small"
                    >
                      <SvgIcon>
                        <XIcon />
                      </SvgIcon>
                    </IconButton>
                  </Tooltip>
                }
              >
                {renderContent(notification, t)}
              </ListItem>
            ))}
          </List>
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Link href="/dashboard/notifications" underline="always" variant="body2">
              {t(tokens.notifications.viewAll)}
            </Link>
          </Box>
        </Scrollbar>
      )}
    </Popover>
  );
};

NotificationsPopover.propTypes = {
  anchorEl: PropTypes.any,
  notifications: PropTypes.array.isRequired,
  onClose: PropTypes.func,
  onMarkAllAsRead: PropTypes.func,
  onRemoveOne: PropTypes.func,
  open: PropTypes.bool,
};
