import type { FC } from 'react';
import PropTypes from 'prop-types';
import { formatDistanceStrict } from 'date-fns';
import Avatar, { avatarClasses } from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';

import { useMockedUser } from 'src/hooks/use-mocked-user';
import type { Message, Thread } from 'src/types/chat';
import type { Tenant } from 'src/types/tenant';
import { customLocale } from 'src/utils/date-locale';

const getLastMessage = (thread: Thread): Message | undefined => {
  return thread.messages?.[thread.messages.length - 1];
};

const getRecipients = (participants: Tenant[], userId: string): Tenant[] => {
  return participants.filter((participant) => participant.id !== userId);
};

const getDisplayName = (recipients: Tenant[]): string => {
  return recipients.map((participant) => (participant.first_name)).join(', ');
};

const getDisplayContent = (userId: string, lastMessage?: Message): string => {
  if (!lastMessage) {
    return '';
  }

  const author = lastMessage.authorId === userId ? 'Me: ' : '';
  const message = lastMessage.contentType === 'image' ? 'Sent a photo' : lastMessage.body;

  return `${author}${message}`;
};

const getLastActivity = (lastMessage?: Message): string | null => {
  if (!lastMessage) {
    return null;
  }

  return formatDistanceStrict(lastMessage.created_at, new Date(), {
    addSuffix: false,
    locale: customLocale,
  });
};

// Helper function to format unread count (max 9, then show 9+)
const formatUnreadCount = (count: number): string => {
  return count > 9 ? '9+' : count.toString();
};

interface ChatThreadItemProps {
  active?: boolean;
  onSelect?: () => void;
  thread: Thread;
}

export const ChatThreadItem: FC<ChatThreadItemProps> = (props) => {
  const { active = false, thread, onSelect, ...other } = props;
  const user = useMockedUser();

  const recipients = getRecipients(thread.participants || [], user.id);
  const lastMessage = getLastMessage(thread);
  const lastActivity = getLastActivity(lastMessage);
  const displayName = getDisplayName(recipients);
  const displayContent = getDisplayContent(user.id, lastMessage);
  const groupThread = recipients.length > 1;
  const isUnread = !!(thread.unreadCount && thread.unreadCount > 0);

  return (
    <Stack
      component="li"
      direction="row"
      onClick={onSelect}
      spacing={2}
      sx={{
        borderRadius: 3,
        cursor: 'pointer',
        px: 2.5,
        py: 2,
        mx: 1,
        mb: 0.5,
        position: 'relative',
        transition: 'all 0.3s ease',
        background: active
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : 'transparent',
        color: active ? 'white' : 'inherit',
        boxShadow: active
          ? '0 8px 25px rgba(102, 126, 234, 0.4)'
          : 'none',
        transform: active ? 'translateY(-1px)' : 'none',
        '&:hover': {
          backgroundColor: active
            ? 'transparent'
            : 'rgba(102, 126, 234, 0.08)',
          transform: active
            ? 'translateY(-1px)'
            : 'translateX(4px)',
          boxShadow: active
            ? '0 8px 25px rgba(102, 126, 234, 0.4)'
            : '0 4px 20px rgba(102, 126, 234, 0.15)',
        },
        // Unread indicator bar on left
        '&::after': isUnread && !active ? {
          content: '""',
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '4px',
          height: '60%',
          backgroundColor: '#ff4757',
          borderRadius: '0 4px 4px 0',
          boxShadow: '0 2px 8px rgba(255, 71, 87, 0.4)',
        } : {},
        // Gradient overlay for active state
        ...(active && {
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 100%)',
            pointerEvents: 'none',
          },
        }),
      }}
      {...other}
    >
      <div>
        <AvatarGroup
          max={2}
          sx={{
            [`& .${avatarClasses.root}`]: groupThread
              ? {
                height: 26,
                width: 26,
                border: active ? '2px solid white' : 'none',
                boxShadow: active
                  ? '0 4px 12px rgba(0,0,0,0.2)'
                  : '0 2px 8px rgba(240, 147, 251, 0.3)',
                transform: active ? 'scale(1.05)' : 'none',
                transition: 'all 0.3s ease',
                background: active
                  ? 'rgba(255,255,255,0.2)'
                  : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                '&:nth-of-type(2)': {
                  mt: '10px',
                },
              }
              : {
                height: 36,
                width: 36,
                border: active ? '3px solid white' : 'none',
                boxShadow: active
                  ? '0 4px 12px rgba(0,0,0,0.2)'
                  : '0 4px 15px rgba(240, 147, 251, 0.3)',
                transform: active ? 'scale(1.05)' : 'none',
                transition: 'all 0.3s ease',
                background: active
                  ? 'rgba(255,255,255,0.2)'
                  : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              },
          }}
        >
          {recipients.map((recipient) => (
            <Avatar
              key={recipient.id}
              src={recipient.avatar_url || undefined}
            />
          ))}
        </AvatarGroup>
      </div>
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'hidden',
        }}
      >
        <Typography
          noWrap
          variant="subtitle2"
          sx={{
            fontWeight: active ? 'bold' : isUnread ? 600 : 'normal',
            color: active ? 'inherit' : isUnread ? 'text.primary' : 'text.secondary',
          }}
        >
          {displayName}
        </Typography>
        <Stack
          alignItems="center"
          direction="row"
          spacing={1}
        >
          {isUnread && !active && (
            <Box
              sx={{
                background: 'linear-gradient(135deg, #ff4757 0%, #ff3742 100%)',
                borderRadius: '50%',
                height: 10,
                width: 10,
                boxShadow: '0 2px 8px rgba(255, 71, 87, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            />
          )}
          <Typography
            color={active ? 'inherit' : 'text.secondary'}
            noWrap
            sx={{
              flexGrow: 1,
              opacity: active ? 0.9 : 1,
            }}
            variant="subtitle2"
          >
            {displayContent}
          </Typography>
        </Stack>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        {/* Unread Count Badge */}
        {isUnread && !active && (
          <Box
            sx={{
              background: 'linear-gradient(135deg, #ff4757 0%, #ff3742 100%)',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.7rem',
              minWidth: '20px',
              height: '20px',
              borderRadius: '10px',
              boxShadow: '0 3px 12px rgba(255, 71, 87, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 0.5,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': {
                  transform: 'scale(1)',
                  boxShadow: '0 3px 12px rgba(255, 71, 87, 0.5)',
                },
                '50%': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 4px 16px rgba(255, 71, 87, 0.7)',
                },
                '100%': {
                  transform: 'scale(1)',
                  boxShadow: '0 3px 12px rgba(255, 71, 87, 0.5)',
                },
              },
            }}
          >
            {formatUnreadCount(thread.unreadCount || 0)}
          </Box>
        )}
        {/* Last Activity Time */}
        {lastActivity && (
          <Typography
            color={active ? 'inherit' : 'text.secondary'}
            sx={{
              whiteSpace: 'nowrap',
              opacity: active ? 0.8 : 1,
              fontSize: '0.75rem',
            }}
            variant="caption"
          >
            {lastActivity}
          </Typography>
        )}
      </Box>
    </Stack>
  );
};

ChatThreadItem.propTypes = {
  active: PropTypes.bool,
  onSelect: PropTypes.func,
  // @ts-ignore
  thread: PropTypes.object.isRequired,
};
