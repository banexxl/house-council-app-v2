import type { FC } from 'react';
import PropTypes from 'prop-types';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface IncidentCommentProps {
  authorAvatar: string;
  authorName: string;
  authorRole: string;
  content: string;
  created_at: number | string;
  isLiked?: boolean;
  likes?: number;
}

export const IncidentComment: FC<IncidentCommentProps> = (props) => {
  const { authorAvatar, authorName, authorRole, content, created_at, ...other } = props;

  return (
    <Stack
      alignItems="flex-start"
      direction="row"
      spacing={2}
      {...other}
    >
      <Avatar src={authorAvatar} />
      <Box
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark' ? 'neutral.900' : 'neutral.100',
          borderRadius: 1,
          p: 2,
          flexGrow: 1,
        }}
      >
        <Box
          sx={{
            alignItems: 'flex-start',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="subtitle2">{authorName}</Typography>
            <Typography color="text.secondary" variant="caption">
              {authorRole}
            </Typography>
          </Box>
          <Typography color="text.secondary" variant="caption">
            {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {content}
        </Typography>
      </Box>
    </Stack>
  );
};

IncidentComment.propTypes = {
  authorAvatar: PropTypes.string.isRequired,
  authorName: PropTypes.string.isRequired,
  authorRole: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  created_at: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  isLiked: PropTypes.bool,
  likes: PropTypes.number,
};

// Backwards compatibility for old imports
export const PostComment = IncidentComment;
