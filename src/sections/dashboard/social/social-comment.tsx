'use client';

import type { FC } from 'react';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import Avatar from '@mui/material/Avatar';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import SvgIcon from '@mui/material/SvgIcon';
import FaceSmileIcon from '@untitled-ui/icons-react/build/esm/FaceSmile';
import ButtonBase from '@mui/material/ButtonBase';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { reactToComment } from 'src/app/actions/social/comment-actions';
import type { EmojiReaction } from 'src/types/social';
import { getInitials } from 'src/utils/get-initials';
import { tokens } from 'src/locales/tokens';

interface SocialCommentProps {
  commentId: string;
  authorId: string;
  authorAvatar: string;
  authorName: string;
  created_at: number;
  message: string;
  reactions?: EmojiReaction[];
  userReaction?: string | null;
  onReactionsChange?: (payload: { reactions: EmojiReaction[]; userReaction: string | null }) => void;
  highlighted?: boolean;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '😢', '👀'];

export const SocialComment: FC<SocialCommentProps> = (props) => {
  const {
    commentId,
    authorId,
    authorAvatar,
    authorName,
    created_at,
    message,
    reactions = [],
    userReaction,
    onReactionsChange,
    highlighted = false,
    ...other
  } = props;

  const { t } = useTranslation();
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const profileLink = `/dashboard/social/profile/${authorId}`;
  const timeAgo = t(tokens.tenants.socialTimeAgo, { distance: formatDistanceToNowStrict(created_at) });
  const [reactionList, setReactionList] = useState<EmojiReaction[]>(reactions);
  const [currentReaction, setCurrentReaction] = useState<string | null>(userReaction ?? null);
  const totalReactions = useMemo(
    () => reactionList.reduce((sum, reaction) => sum + reaction.count, 0),
    [reactionList]
  );
  const currentReactionCount = useMemo(() => {
    if (!currentReaction) return 0;
    const entry = reactionList.find((reaction) => reaction.emoji === currentReaction);
    return entry?.count ?? 0;
  }, [currentReaction, reactionList]);

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
          toast.error(result.error || t(tokens.tenants.socialReactionError));
          return;
        }
        setReactionList(result.data.reactions);
        setCurrentReaction(result.data.userReaction);
        onReactionsChange?.(result.data);
      } catch (error) {
        console.error('Error reacting to comment:', error);
        toast.error(t(tokens.tenants.socialReactionError));
      }
    },
    [commentId, onReactionsChange, t]
  );

  return (
    <Stack
      id={`comment-${commentId}`}
      alignItems="flex-start"
      direction="row"
      spacing={2}
      sx={{
        border: highlighted ? '1px solid' : undefined,
        borderColor: highlighted ? 'primary.main' : undefined,
        borderRadius: highlighted ? 1 : undefined,
        boxShadow: highlighted ? 3 : undefined,
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      }}
      {...other}
    >
      <Avatar
        component="a"
        href={profileLink}
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
            href={profileLink}
            variant="subtitle2"
          >
            {authorName}
          </Link>
          <Box sx={{ flexGrow: 1 }} />
          <Typography
            color="text.secondary"
            variant="caption"
          >
            {timeAgo}
          </Typography>
        </Stack>
        <Typography variant="body2">{message}</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {reactionList.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {reactionList.map((reaction) => (
                <ButtonBase
                  key={reaction.emoji}
                  onClick={() => handleReactionSelect(reaction.emoji)}
                  sx={{
                    borderRadius: 999,
                    alignItems: 'center',
                    bgcolor: reaction.userReacted ? 'primary.light' : 'grey.100',
                    border: '1px solid',
                    borderColor: reaction.userReacted ? 'primary.main' : 'grey.200',
                    display: 'inline-flex',
                    gap: 0.5,
                    px: 1.25,
                    py: 0.25,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: reaction.userReacted ? 'primary.light' : 'grey.200',
                    },
                  }}
                >
                  <Typography variant="body2">{reaction.emoji}</Typography>
                  <Typography color="text.secondary" variant="caption">
                    {reaction.count}
                  </Typography>
                </ButtonBase>
              ))}
            </Box>
          )}
          {currentReaction && (
            <Typography variant="caption" color="text.secondary">
              {t(tokens.tenants.socialReactionSummary, { emoji: currentReaction, count: currentReactionCount })}
            </Typography>
          )}
          <Tooltip title={currentReaction ? t(tokens.tenants.socialReactionChange) : t(tokens.tenants.socialReactionAddComment)}>
            <span>
              <IconButton
                size="small"
                onClick={(e) => setPickerAnchor(e.currentTarget)}
                color={currentReaction ? 'primary' : 'default'}
              >
                <SvgIcon fontSize="small">
                  <FaceSmileIcon />
                </SvgIcon>
              </IconButton>
            </span>
          </Tooltip>
          {totalReactions > 0 && !currentReaction && (
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
  authorId: PropTypes.string.isRequired,
  authorAvatar: PropTypes.string.isRequired,
  authorName: PropTypes.string.isRequired,
  created_at: PropTypes.number.isRequired,
  message: PropTypes.string.isRequired,
  reactions: PropTypes.array,
  userReaction: PropTypes.string,
  onReactionsChange: PropTypes.func,
  highlighted: PropTypes.bool,
};
