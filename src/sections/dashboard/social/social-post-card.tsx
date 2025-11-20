'use client'

import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { formatDistanceToNowStrict } from 'date-fns';
import ClockIcon from '@untitled-ui/icons-react/build/esm/Clock';
import Share07Icon from '@untitled-ui/icons-react/build/esm/Share07';
import DotsVerticalIcon from '@untitled-ui/icons-react/build/esm/DotsVertical';
import Archive from '@untitled-ui/icons-react/build/esm/Archive';
import FaceSmileIcon from '@untitled-ui/icons-react/build/esm/FaceSmile';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import { toast } from 'react-hot-toast';

import { archiveTenantPost } from 'src/app/actions/social/post-actions';
import { reactToPost } from 'src/app/actions/social/like-actions';

import type { EmojiReaction, TenantPostCommentWithAuthor, TenantPostImage } from 'src/types/social';

import { SocialComment } from './social-comment';
import { SocialCommentAdd } from './social-comment-add';
import { SocialPostMediaGrid } from './social-post-media-grid';

const REACTION_EMOJIS = [
  '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😇', '😉', '😊',
  '😍', '😘', '😜', '🤩', '🤗', '🤔', '🤨', '😎', '🥳', '😭',
  '😡', '👍', '👏', '🙏', '💪', '🔥', '🌟', '🚀', '❤️', '💯',
  '🎉', '🥰', '😱', '🤯', '😴', '💡', '🤝', '🍀'
];

interface SocialPostCardProps {
  postId: string;
  authorAvatar: string;
  authorName: string;
  comments: TenantPostCommentWithAuthor[];
  createdAt: number;
  likes?: number;
  media?: TenantPostImage[];
  message: string;
  isOwner?: boolean;
  onArchive?: () => void;
  reactions?: EmojiReaction[];
  userReaction?: string | null;
  onReactionsChange?: (payload: { reactions: EmojiReaction[]; userReaction: string | null }) => void;
}

export const SocialPostCard: FC<SocialPostCardProps> = (props) => {
  const {
    postId,
    authorAvatar,
    authorName,
    comments,
    createdAt,
    media,
    message,
    isOwner = false,
    onArchive,
    reactions: reactionsProp,
    userReaction: userReactionProp,
    onReactionsChange,
    ...other
  } = props;
  const [reactionAnchorEl, setReactionAnchorEl] = useState<null | HTMLElement>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [reactionList, setReactionList] = useState<EmojiReaction[]>(reactionsProp ?? []);
  const [currentReaction, setCurrentReaction] = useState<string | null>(userReactionProp ?? null);

  useEffect(() => {
    setReactionList(reactionsProp ?? []);
  }, [reactionsProp]);

  useEffect(() => {
    setCurrentReaction(userReactionProp ?? null);
  }, [userReactionProp]);

  const totalReactions = useMemo(
    () => reactionList.reduce((sum, reaction) => sum + reaction.count, 0),
    [reactionList]
  );
  const currentReactionCount = useMemo(() => {
    if (!currentReaction) return 0;
    const entry = reactionList.find((reaction) => reaction.emoji === currentReaction);
    return entry?.count ?? 0;
  }, [currentReaction, reactionList]);

  const handleReactionButtonClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setReactionAnchorEl(event.currentTarget);
  }, []);

  const handleReactionClose = useCallback(() => {
    setReactionAnchorEl(null);
  }, []);

  const handleReactionSelect = useCallback(
    async (emoji: string) => {
      setReactionAnchorEl(null);
      setIsReacting(true);
      try {
        const result = await reactToPost(postId, emoji);
        if (!result.success || !result.data) {
          toast.error(result.error || 'Failed to react to post');
          return;
        }
        setReactionList(result.data.reactions);
        setCurrentReaction(result.data.userReaction ?? null);
        onReactionsChange?.(result.data);
      } catch (error) {
        console.error('Error reacting to post:', error);
        toast.error('Failed to react to post');
      } finally {
        setIsReacting(false);
      }
    },
    [postId, onReactionsChange]
  );

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
  }, []);

  const handleArchive = useCallback(async () => {
    setMenuAnchorEl(null);
    setIsArchiving(true);
    try {
      const result = await archiveTenantPost(postId);
      if (result.success) {
        toast.success('Post archived successfully');
        onArchive?.();
      } else {
        toast.error(result.error || 'Failed to archive post');
      }
    } catch (error) {
      console.error('Error archiving post:', error);
      toast.error('Failed to archive post');
    } finally {
      setIsArchiving(false);
    }
  }, [postId, onArchive]);

  return (
    <Card {...other}>
      <CardHeader
        avatar={
          <Avatar
            component="a"
            href="#"
            src={authorAvatar}
          />
        }
        action={
          isOwner ? (
            <>
              <IconButton onClick={handleMenuOpen} disabled={isArchiving}>
                <SvgIcon>
                  <DotsVerticalIcon />
                </SvgIcon>
              </IconButton>
              <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={handleArchive}>
                  <ListItemIcon>
                    <SvgIcon>
                      <Archive />
                    </SvgIcon>
                  </ListItemIcon>
                  <ListItemText>Archive Post</ListItemText>
                </MenuItem>
              </Menu>
            </>
          ) : null
        }
        disableTypography
        subheader={
          <Stack
            alignItems="center"
            direction="row"
            spacing={1}
          >
            <SvgIcon color="action">
              <ClockIcon />
            </SvgIcon>
            <Typography
              color="text.secondary"
              variant="caption"
            >
              {formatDistanceToNowStrict(createdAt)} ago
            </Typography>
          </Stack>
        }
        title={
          <Stack
            alignItems="center"
            direction="row"
            spacing={0.5}
            sx={{ mb: 1 }}
          >
            <Link
              color="text.primary"
              href="#"
              variant="subtitle2"
            >
              {authorName}
            </Link>
            <Typography variant="body2">updated her status</Typography>
          </Stack>
        }
      />
      <Box
        sx={{
          pb: 2,
          px: 3,
        }}
      >
        <Typography variant="body1">{message}</Typography>
        {Array.isArray(media) && media.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <SocialPostMediaGrid media={media} />
          </Box>
        )}
        {reactionList.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {reactionList.map((reaction) => (
                <ButtonBase
                  key={reaction.emoji}
                  onClick={() => handleReactionSelect(reaction.emoji)}
                  disabled={isReacting}
                  sx={{
                    borderRadius: 999,
                    alignItems: 'center',
                    bgcolor: reaction.userReacted ? 'primary.light' : 'grey.100',
                    border: '1px solid',
                    borderColor: reaction.userReacted ? 'primary.main' : 'grey.200',
                    display: 'inline-flex',
                    gap: 0.5,
                    px: 1.5,
                    py: 0.5,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: reaction.userReacted ? 'primary.light' : 'grey.200',
                    },
                  }}
                >
                  <Typography variant="body2">{reaction.emoji}</Typography>
                  <Typography
                    color="text.secondary"
                    variant="caption"
                  >
                    {reaction.count}
                  </Typography>
                </ButtonBase>
              ))}
            </Stack>
            {currentReaction && (
              <Typography
                color="text.secondary"
                variant="caption"
                sx={{ mt: 1 }}
              >
                You reacted with {currentReaction} · {currentReactionCount}
              </Typography>
            )}
          </Box>
        )}
        <Stack
          alignItems="center"
          direction="row"
          justifyContent="space-between"
          spacing={2}
          sx={{ mt: 2 }}
        >
          <div>
            <Stack
              alignItems="center"
              direction="row"
            >
              <Tooltip title={currentReaction ? 'Change your reaction' : 'React to this post'}>
                <span>
                  <IconButton onClick={handleReactionButtonClick} disabled={isReacting}>
                    <SvgIcon color={currentReaction ? 'primary' : undefined}>
                      <FaceSmileIcon />
                    </SvgIcon>
                  </IconButton>
                </span>
              </Tooltip>
              {totalReactions > 0 && (
                <Typography
                  color="text.secondary"
                  variant="subtitle2"
                >
                  {totalReactions}
                </Typography>
              )}
            </Stack>
          </div>
          <div>
            <IconButton>
              <SvgIcon>
                <Share07Icon />
              </SvgIcon>
            </IconButton>
          </div>
        </Stack>
        <Divider sx={{ my: 3 }} />
        <Stack spacing={3}>
          {comments.map((comment: TenantPostCommentWithAuthor) => (
            <SocialComment
              authorAvatar={comment.author.avatar_url || ''}
              authorName={`${comment.author.first_name || ''} ${comment.author.last_name || ''}`.trim()}
              created_at={new Date(comment.created_at).getTime()}
              key={comment.id}
              message={comment.comment_text}
            />
          ))}
        </Stack>
        <Divider sx={{ my: 3 }} />
        <SocialCommentAdd />
      </Box>
      <Popover
        open={Boolean(reactionAnchorEl)}
        anchorEl={reactionAnchorEl}
        onClose={handleReactionClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Box
          sx={{
            maxHeight: 220,
            width: 280,
            overflowY: 'auto',
            p: 1,
          }}
        >
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {REACTION_EMOJIS.map((emoji) => (
              <IconButton
                key={emoji}
                onClick={() => handleReactionSelect(emoji)}
                disabled={isReacting}
                size="small"
              >
                <span style={{ fontSize: 22 }}>{emoji}</span>
              </IconButton>
            ))}
          </Stack>
        </Box>
      </Popover>
    </Card>
  );
};

SocialPostCard.propTypes = {
  postId: PropTypes.string.isRequired,
  authorAvatar: PropTypes.string.isRequired,
  authorName: PropTypes.string.isRequired,
  comments: PropTypes.array.isRequired,
  createdAt: PropTypes.number.isRequired,
  likes: PropTypes.number,
  // media: PropTypes.arrayOf(
  //   PropTypes.shape({
  //     id: PropTypes.string.isRequired,
  //     post_id: PropTypes.string.isRequired,
  //     storage_bucket: PropTypes.string.isRequired,
  //     storage_path: PropTypes.string.isRequired,
  //     created_at: PropTypes.string,
  //     updated_at: PropTypes.string,
  //   })
  // ),
  message: PropTypes.string.isRequired,
  isOwner: PropTypes.bool,
  onArchive: PropTypes.func,
  // reactions: PropTypes.arrayOf(
  //   PropTypes.shape({
  //     emoji: PropTypes.string.isRequired,
  //     count: PropTypes.number.isRequired,
  //     userReacted: PropTypes.bool.isRequired,
  //   })
  // ),
  userReaction: PropTypes.string,
  onReactionsChange: PropTypes.func,
};
