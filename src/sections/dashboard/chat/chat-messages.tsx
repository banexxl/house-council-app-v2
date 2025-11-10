import type { FC } from 'react';
import PropTypes from 'prop-types';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import { useMockedUser } from 'src/hooks/use-mocked-user';
import type { Message, Participant } from 'src/types/chat';
import type { User } from 'src/types/user';

import { ChatMessage } from './chat-message';

const getAuthor = (message: Message, participants: Participant[], user: User) => {
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
    avatar: participant!.avatar,
    name: participant!.name,
    isUser: false,
  };
};

interface ChatMessagesProps {
  messages?: Message[];
  participants?: Participant[];
  currentUser?: User;
}

export const ChatMessages: FC<ChatMessagesProps> = (props) => {
  const { messages = [], participants = [], currentUser, ...other } = props;
  const mockedUser = useMockedUser();

  // Use provided currentUser or fall back to mocked user
  const user = currentUser || mockedUser;

  console.log('📨 ChatMessages Debug:', {
    messagesCount: messages.length,
    participantsCount: participants.length,
    currentUserId: user?.id,
    firstFewMessages: messages.slice(0, 3).map(m => ({
      id: m.id,
      body: m.body?.substring(0, 50),
      authorId: m.authorId
    }))
  });

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
          const author = getAuthor(message, participants, user);

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
