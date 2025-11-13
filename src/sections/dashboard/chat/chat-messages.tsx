import type { FC } from 'react';
import PropTypes from 'prop-types';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { Message } from 'src/types/chat';
import type { Tenant } from 'src/types/tenant';
import type { User } from 'src/types/user';

import { ChatMessage } from './chat-message';

const getAuthor = (message: Message, participants: Tenant[], user: User) => {
  const participant = participants.find((participant) => participant.id === message.authorId);

  // This should never happen
  if (!participant) {
    return {
      name: 'Unknown',
      avatar: '',
      isUser: false,
    };
  }

  // Since chat mock db is not synced with external auth providers
  // we set the user details from user auth state instead of thread participants
  if (message.authorId === user.id) {
    return {
      name: 'Me',
      avatar: user.avatar,
      isUser: true,
    };
  }

  return {
    avatar: participant.avatar_url || '',
    name: `${participant.first_name} ${participant.last_name}`,
    isUser: false,
  };
};

interface ChatMessagesProps {
  messages?: Message[];
  participants?: Tenant[];
  currentUser?: User;
}

export const ChatMessages: FC<ChatMessagesProps> = (props) => {
  const { messages = [], participants = [], currentUser, ...other } = props;


  return (
    <Stack
      spacing={2}
      sx={{
        p: 3,
        minHeight: '100%',
        justifyContent: messages.length > 0 ? 'flex-start' : 'center',
        flex: '1 1 auto',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundImage: `
          radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 0%, transparent 50%)
        `,
        backgroundAttachment: 'fixed',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03' fill-rule='evenodd'%3E%3Cpath d='m0 40l40-40h-40v40zm40 0v-40h-40l40 40z'/%3E%3C/g%3E%3C/svg%3E")`,
          pointerEvents: 'none',
        }
      }}
      {...other}
    >
      {messages.length === 0 ? (
        <Box sx={{
          textAlign: 'center',
          opacity: 0.9,
          zIndex: 1,
          position: 'relative',
        }}>
          <Typography
            variant="h6"
            color="white"
            sx={{
              mb: 1,
              fontWeight: 300,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            No messages yet
          </Typography>
          <Typography
            variant="body2"
            color="white"
            sx={{
              opacity: 0.8,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            Start the conversation!
          </Typography>
        </Box>
      ) : (
        messages.map((message) => {
          const author = getAuthor(message, participants, currentUser!);

          return (
            <Box
              key={message.id}
              data-message={message.id}
              sx={{
                position: 'relative',
                zIndex: 1,
              }}
            >
              <ChatMessage
                authorAvatar={author.avatar}
                authorName={author.name}
                body={message.body}
                contentType={message.contentType}
                created_at={message.created_at}
                position={author.isUser ? 'right' : 'left'}
              />
            </Box>
          );
        })
      )}
    </Stack>
  );
};

ChatMessages.propTypes = {
  messages: PropTypes.array,
  participants: PropTypes.array,
  currentUser: PropTypes.any,
};
