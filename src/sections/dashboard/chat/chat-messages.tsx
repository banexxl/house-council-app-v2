import type { FC } from 'react';
import PropTypes from 'prop-types';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { Message } from 'src/types/chat';
import type { Tenant } from 'src/types/tenant';
import { getTenantAvatar, getTenantFullName } from 'src/types/tenant';
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
    avatar: getTenantAvatar(participant),
    name: getTenantFullName(participant),
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
      }}
      {...other}
    >
      {messages.length === 0 ? (
        <Box sx={{ textAlign: 'center', opacity: 0.6 }}>
          <Typography variant="body2" color="text.secondary">
            No messages yet. Start the conversation!
          </Typography>
        </Box>
      ) : (
        messages.map((message) => {
          const author = getAuthor(message, participants, currentUser!);

          return (
            <Box key={message.id} data-message={message.id}>
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
