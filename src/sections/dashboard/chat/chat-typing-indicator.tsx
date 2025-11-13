import type { FC } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { alpha } from '@mui/material/styles';

interface TypingUser {
     user_id: string;
     user_name?: string;
     user_email?: string;
     first_name?: string;
     last_name?: string;
     started_at: string;
     is_typing?: boolean;
     timestamp?: string;
     tenant?: any;
}

interface ChatTypingIndicatorProps {
     typingUsers: TypingUser[];
}

const TypingDots: FC = () => (
     <Box
          component="span"
          sx={{
               display: 'inline-flex',
               alignItems: 'center',
               gap: 0.5,
               ml: 1,
          }}
     >
          {[0, 1, 2].map((dot) => (
               <Box
                    key={dot}
                    sx={{
                         width: 4,
                         height: 4,
                         borderRadius: '50%',
                         backgroundColor: 'text.secondary',
                         animation: 'typing-dots 1.4s infinite',
                         animationDelay: `${dot * 0.2}s`,
                         '@keyframes typing-dots': {
                              '0%, 60%, 100%': {
                                   opacity: 0.3,
                                   transform: 'translateY(0)',
                              },
                              '30%': {
                                   opacity: 1,
                                   transform: 'translateY(-4px)',
                              },
                         },
                    }}
               />
          ))}
     </Box>
);

export const ChatTypingIndicator: FC<ChatTypingIndicatorProps> = (props) => {
     const { typingUsers = [] } = props;

     if (typingUsers.length === 0) {
          return null;
     }

     const getTypingText = () => {
          if (typingUsers.length === 1) {
               const user = typingUsers[0];
               const displayName = user.first_name || user.user_name || user.user_email?.split('@')[0] || 'Someone';
               return `${displayName} is typing`;
          } else if (typingUsers.length === 2) {
               const names = typingUsers.map(user =>
                    user.first_name || user.user_name || user.user_email?.split('@')[0] || 'Someone'
               );
               return `${names.join(' and ')} are typing`;
          } else {
               const firstUser = typingUsers[0];
               const firstName = firstUser.first_name || firstUser.user_name || firstUser.user_email?.split('@')[0] || 'Someone';
               return `${firstName} and ${typingUsers.length - 1} others are typing`;
          }
     };

     return (
          <Box
               sx={{
                    px: 3,
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    borderTop: 1,
                    borderColor: 'divider',
                    backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.8),
               }}
          >
               <Chip
                    size="small"
                    variant="outlined"
                    sx={{
                         fontSize: '0.75rem',
                         height: 24,
                         backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                         borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
                         color: 'text.secondary',
                         '& .MuiChip-label': {
                              px: 1,
                         },
                    }}
                    label={
                         <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="caption" component="span">
                                   {getTypingText()}
                              </Typography>
                              <TypingDots />
                         </Box>
                    }
               />
          </Box>
     );
};

ChatTypingIndicator.propTypes = {
     typingUsers: PropTypes.array.isRequired,
};