import { useCallback, type FC } from 'react';
import { formatDistanceStrict } from 'date-fns';
import PropTypes from 'prop-types';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { alpha } from '@mui/material/styles';
import { useRouter } from 'next/navigation';

import { Presence } from 'src/components/presence';
import { customLocale } from 'src/utils/date-locale';
import { useTranslation } from 'react-i18next';
import { Divider } from '@mui/material';

interface Contact {
  id: string;
  avatar: string;
  isActive: boolean;
  lastActivity?: number;
  name: string;
  userId?: string;
}

interface ContactsPopoverProps {
  anchorEl: null | Element;
  contacts?: Contact[];
  onClose?: () => void;
  open?: boolean;
  buildingIds?: string[];
  isPresenceConnected?: boolean;
}

export const ContactsPopover: FC<ContactsPopoverProps> = (props) => {
  const {
    anchorEl,
    contacts = [],
    onClose,
    open = false,
    buildingIds = [],
    isPresenceConnected = false,
    ...other
  } = props;
  const router = useRouter();
  const { t } = useTranslation();
  const handleNavigate = useCallback((contactId: string) => {
    if (!contactId) return;
    onClose?.();
    router.push(`/dashboard/social/profile/${contactId}`);
  }, [onClose, router]);

  // Separate online and offline contacts
  const onlineContacts = contacts.filter(contact => contact.isActive);
  const offlineContacts = contacts.filter(contact => !contact.isActive);

  return (
    <Popover
      anchorEl={anchorEl}
      anchorOrigin={{
        horizontal: 'center',
        vertical: 'bottom',
      }}
      disableScrollLock
      onClose={onClose}
      open={open}
      slotProps={{ paper: { sx: { width: 320 } } }}
      {...other}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">{t('contacts.title')}</Typography>
          {isPresenceConnected && (
            <Chip
              label={`${onlineContacts.length} online`}
              size="small"
              variant="outlined"
              sx={{
                borderColor: 'success.main',
                color: 'success.main',
                backgroundColor: theme => alpha(theme.palette.success.main, 0.1),
              }}
            />
          )}
        </Box>
        {!isPresenceConnected && buildingIds.length > 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.5, display: 'block' }}
          >
            Connecting to real-time presence...
          </Typography>
        )}
      </Box>
      <Divider />
      <Box sx={{ p: 2, maxHeight: 400, overflowY: 'auto' }}>
        {contacts && contacts.length > 0 ? (
          <List disablePadding>
            {/* Online users first */}
            {onlineContacts.length > 0 && (
              <>
                {onlineContacts.map((contact) => (
                  <ListItem
                    disableGutters
                    key={contact.id}
                    onClick={() => handleNavigate(contact.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleNavigate(contact.id);
                      }
                    }}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        borderRadius: 1,
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={contact.avatar}
                        sx={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleNavigate(contact.id);
                        }}
                      />
                    </ListItemAvatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Link
                        color="text.primary"
                        noWrap
                        sx={{ cursor: 'pointer' }}
                        underline="none"
                        variant="subtitle2"
                        display="block"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleNavigate(contact.id);
                        }}
                      >
                        {contact.name}
                      </Link>
                      <Typography
                        variant="caption"
                        color="success.main"
                        sx={{ fontWeight: 500, display: 'block' }}
                      >
                        Online now
                      </Typography>
                    </Box>
                    <Presence
                      size="small"
                      status="online"
                    />
                  </ListItem>
                ))}
                {offlineContacts.length > 0 && (
                  <Divider sx={{ my: 1 }} />
                )}
              </>
            )}

            {/* Offline users */}
            {offlineContacts.map((contact) => {
              const lastActivity =
                contact.lastActivity
                  ? formatDistanceStrict(contact.lastActivity, new Date(), {
                    addSuffix: true,
                    locale: customLocale,
                  })
                  : undefined;

              // Determine if user was recently online (less than 1 hour ago)
              const isRecentlyOnline = contact.lastActivity
                ? (new Date().getTime() - contact.lastActivity) < (60 * 60 * 1000) // 1 hour in milliseconds
                : false;

              return (
                <ListItem
                  disableGutters
                  key={contact.id}
                  onClick={() => handleNavigate(contact.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleNavigate(contact.id);
                    }
                  }}
                  sx={{
                    opacity: 0.7,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      borderRadius: 1,
                      opacity: 1,
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={contact.avatar}
                      sx={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNavigate(contact.id);
                      }}
                    />
                  </ListItemAvatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Link
                      color="text.primary"
                      noWrap
                      sx={{ cursor: 'pointer' }}
                      underline="none"
                      variant="subtitle2"
                      display="block"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNavigate(contact.id);
                      }}
                    >
                      {contact.name}
                    </Link>
                    {lastActivity && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block' }}
                      >
                        Last online {lastActivity}
                      </Typography>
                    )}
                  </Box>
                  {/* Status dot for offline users */}
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: isRecentlyOnline ? 'warning.main' : 'error.main',
                      ml: 1,
                    }}
                  />
                </ListItem>
              );
            })}
          </List>
        ) : (
          <ListItem>
            <ListItemText primary={t('contacts.noContactsAvailable')} />
          </ListItem>
        )}
      </Box>
    </Popover>
  );
};

ContactsPopover.propTypes = {
  anchorEl: PropTypes.any,
  contacts: PropTypes.array,
  onClose: PropTypes.func,
  open: PropTypes.bool,
  buildingIds: PropTypes.arrayOf(PropTypes.string),
  isPresenceConnected: PropTypes.bool,
};
