import type { FC } from 'react';
import PropTypes from 'prop-types';
import { formatDistanceToNowStrict } from 'date-fns';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface ChatMessageProps {
  authorAvatar?: string | null;
  authorName: string;
  body: string;
  contentType: string;
  created_at: number;
  position?: 'left' | 'right';
}

export const ChatMessage: FC<ChatMessageProps> = (props) => {
  const { authorAvatar, authorName, body, contentType, created_at, position, ...other } = props;

  const ago = formatDistanceToNowStrict(created_at);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: position === 'right' ? 'flex-end' : 'flex-start',
      }}
      {...other}
    >
      <Stack
        alignItems="flex-start"
        direction={position === 'right' ? 'row-reverse' : 'row'}
        spacing={2}
        sx={{
          maxWidth: 500,
          ml: position === 'right' ? 'auto' : 0,
          mr: position === 'left' ? 'auto' : 0,
        }}
      >
        <Avatar
          src={authorAvatar || undefined}
          sx={{
            height: 40,
            width: 40,
            border: '3px solid white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        />
        <Box sx={{ flexGrow: 1 }}>
          <Card
            sx={{
              background: position === 'right'
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: position === 'right' ? 'white' : 'white',
              px: 2.5,
              py: 1.5,
              borderRadius: position === 'right' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              border: 'none',
              position: 'relative',
              overflow: 'visible',
              '&::before': position === 'right' ? {
                content: '""',
                position: 'absolute',
                bottom: 0,
                right: -8,
                width: 0,
                height: 0,
                border: '8px solid transparent',
                borderTopColor: '#764ba2',
                borderLeft: 'none',
                borderBottomColor: 'transparent',
              } : {
                content: '""',
                position: 'absolute',
                bottom: 0,
                left: -8,
                width: 0,
                height: 0,
                border: '8px solid transparent',
                borderTopColor: '#f5576c',
                borderRight: 'none',
                borderBottomColor: 'transparent',
              },
            }}
          >
            <Box sx={{ mb: 1 }}>
              <Link
                color="inherit"
                sx={{
                  cursor: 'pointer',
                  fontWeight: 600,
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  '&:hover': {
                    textDecoration: 'none',
                    opacity: 0.8,
                  }
                }}
                variant="subtitle2"
              >
                {authorName}
              </Link>
            </Box>
            {contentType === 'image' && (
              <CardMedia
                onClick={(): void => { }}
                image={body}
                sx={{
                  height: 200,
                  width: 200,
                }}
              />
            )}
            {contentType === 'text' && (
              <Typography
                color="inherit"
                variant="body1"
                sx={{
                  lineHeight: 1.5,
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                }}
              >
                {body}
              </Typography>
            )}
          </Card>
          <Box
            sx={{
              display: 'flex',
              justifyContent: position === 'right' ? 'flex-end' : 'flex-start',
              mt: 1,
              px: 2,
            }}
          >
            <Typography
              color="text.secondary"
              noWrap
              variant="caption"
            >
              {ago} ago
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
};

ChatMessage.propTypes = {
  authorAvatar: PropTypes.string.isRequired,
  authorName: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
  contentType: PropTypes.string.isRequired,
  created_at: PropTypes.number.isRequired,
  position: PropTypes.oneOf(['left', 'right']),
};
