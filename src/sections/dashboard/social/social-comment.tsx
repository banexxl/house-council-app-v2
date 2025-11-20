'use client'

import type { FC } from 'react';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import SvgIcon from '@mui/material/SvgIcon';
import FaceSmileIcon from '@untitled-ui/icons-react/build/esm/FaceSmile';
import { toast } from 'react-hot-toast';

import { reactToComment } from 'src/app/actions/social/comment-actions';
import type { EmojiReaction } from 'src/types/social';
import { getInitials } from 'src/utils/get-initials';
import Popover from '@mui/material/Popover';

interface SocialCommentProps {
  commentId: string;
  authorAvatar: string;
  authorName: string;
  created_at: number;
  message: string;
  reactions?: EmojiReaction[];
  userReaction?: string | null;
  onReactionsChange?: (payload: { reactions: EmojiReaction[]; userReaction: string | null }) => void;
}

export const SocialComment: FC<SocialCommentProps> = (props) => {
  const {
    commentId,
    authorAvatar,
    authorName,
    created_at,
    message,
    reactions = [],
    userReaction,
    onReactionsChange,
    ...other
  } = props;

  const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '😢', '👀'];
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const ago = formatDistanceToNowStrict(created_at);
  const [reactionList, setReactionList] = useState<EmojiReaction[]>(reactions);
  const [currentReaction, setCurrentReaction] = useState<string | null>(userReaction ?? null);
  const totalReactions = useMemo(
    () => reactionList.reduce((sum, reaction) => sum + reaction.count, 0),
    [reactionList]
  );

  useEffect(() => {
    setReactionList(reactions ?? []);
  }, [reactions]);

  useEffect(() => {
    setCurrentReaction(userReaction ?? null);
  }, [userReaction]);

  const handleReactionSelect = useCallback(
    async (emoji: string) => {
      try {
        const result = await reactToComment(commentId, emoji);
        if (!result.success || !result.data) {
          toast.error(result.error || 'Failed to react');
          return;
        }
        setReactionList(result.data.reactions);
        setCurrentReaction(result.data.userReaction);
        onReactionsChange?.(result.data);
      } catch (error) {
        console.error('Error reacting to comment:', error);
        toast.error('Failed to react');
      }
    },
    [commentId, onReactionsChange]
  );

  return (
    <Stack
      alignItems="flex-start"
      direction="row"
      spacing={2}
      {...other}
    >
      <Avatar
        component="a"
        href="#"
        src={authorAvatar}
      >
        {getInitials(authorName)}
      </Avatar>
      <Stack
        spacing={1}
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark' ? 'neutral.800' : 'neutral.50',
          borderRadius: 1,
          flexGrow: 1,
          p: 2,
        }}
      >
        <Stack
          alignItems="center"
          direction="row"
          spacing={1}
        >
          <Link
            color="text.primary"
            href="#"
            variant="subtitle2"
          >
            {authorName}
          </Link>
          <Box sx={{ flexGrow: 1 }} />
          <Typography
            color="text.secondary"
            variant="caption"
          >
            {ago} ago
          </Typography>
        </Stack>
        <Typography variant="body2">{message}</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton
            size="small"
            onClick={(e) => setPickerAnchor(e.currentTarget)}
            color={currentReaction ? 'primary' : 'default'}
          >
            <SvgIcon fontSize="small">
              <FaceSmileIcon />
            </SvgIcon>
          </IconButton>
          {totalReactions > 0 && (
            <Typography variant="caption" color="text.secondary">
              {totalReactions}
            </Typography>
          )}
        </Stack>
      </Stack>
      <Popover
        open={Boolean(pickerAnchor)}
        anchorEl={pickerAnchor}
        onClose={() => setPickerAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {REACTION_EMOJIS.map((emoji) => (
            <IconButton
              key={emoji}
              size="small"
              onClick={() => {
                handleReactionSelect(emoji);
                setPickerAnchor(null);
              }}
            >
              <span style={{ fontSize: 18 }}>{emoji}</span>
            </IconButton>
          ))}
        </Box>
      </Popover>
    </Stack>
  );
};

SocialComment.propTypes = {
  commentId: PropTypes.string.isRequired,
  authorAvatar: PropTypes.string.isRequired,
  authorName: PropTypes.string.isRequired,
  created_at: PropTypes.number.isRequired,
  message: PropTypes.string.isRequired,
  reactions: PropTypes.array,
  userReaction: PropTypes.string,
  onReactionsChange: PropTypes.func,
};
