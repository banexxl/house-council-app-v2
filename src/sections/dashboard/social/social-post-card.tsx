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
import { getPostComments, createTenantPostComment } from 'src/app/actions/social/comment-actions';
import { useSignedUrl } from 'src/hooks/use-signed-urls';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';

import type { EmojiReaction, TenantPostCommentWithAuthor, TenantPostImage, TenantProfile } from 'src/types/social';

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
  authorId: string;
  buildingId: string;
  authorAvatar: string;
  authorName: string;
  comments?: TenantPostCommentWithAuthor[];
  created_at: number;
  likes?: number;
  media?: TenantPostImage[];
  documents?: Array<{
    id?: string;
    storage_bucket?: string | null;
    storage_path?: string | null;
    file_name?: string | null;
    mime_type?: string | null;
  }>;
  message: string;
  isOwner?: boolean;
  onArchive?: () => void;
  reactions?: EmojiReaction[];
  userReaction?: string | null;
  onReactionsChange?: (payload: { reactions: EmojiReaction[]; userReaction: string | null }) => void;
  currentUserProfile?: TenantProfile;
  highlighted?: boolean;
  focusCommentId?: string | null;
}

const AttachmentLink = ({
  doc,
}: {
  doc: {
    id?: string;
    storage_bucket?: string | null;
    storage_path?: string | null;
    file_name?: string | null;
    mime_type?: string | null;
  };
}) => {
  const { url } = useSignedUrl(
    doc.storage_bucket as string,
    doc.storage_path as string,
    { ttlSeconds: 60 * 30, refreshSkewSeconds: 20 }
  );
  const label = doc.file_name || doc.storage_path?.split('/').pop() || 'Document';
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <SvgIcon fontSize="small" color={url ? 'primary' : 'disabled'}>
        <InsertDriveFileIcon />
      </SvgIcon>
      {url ? (
        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          color="primary"
        >
          {label}
        </Link>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {label} (link unavailable)
        </Typography>
      )}
    </Stack>
  );
};

export const SocialPostCard: FC<SocialPostCardProps> = (props) => {
  const {
    postId,
    authorId,
    buildingId,
    authorAvatar,
    authorName,
    created_at,
    media,
    documents = [],
    message,
    isOwner = false,
    onArchive,
    reactions: reactionsProp,
    userReaction: userReactionProp,
    onReactionsChange,
    currentUserProfile,
    highlighted = false,
    focusCommentId = null,
    ...other
  } = props;
  const authorProfileLink = `/dashboard/social/profile/${authorId}`;
  const [reactionAnchorEl, setReactionAnchorEl] = useState<null | HTMLElement>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [reactionList, setReactionList] = useState<EmojiReaction[]>(reactionsProp ?? []);
  const [currentReaction, setCurrentReaction] = useState<string | null>(userReactionProp ?? null);
  const COMMENTS_PAGE_SIZE = 5;
  const [commentList, setCommentList] = useState<TenantPostCommentWithAuthor[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [totalComments, setTotalComments] = useState(0);
  const [nextCommentsOffset, setNextCommentsOffset] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [shareAnchorEl, setShareAnchorEl] = useState<null | HTMLElement>(null);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    setReactionList(reactionsProp ?? []);
  }, [reactionsProp]);

  useEffect(() => {
    setCurrentReaction(userReactionProp ?? null);
  }, [userReactionProp]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    setShareUrl(`${origin}/dashboard/social/feed?postId=${postId}`);
  }, [postId]);

  const fetchComments = useCallback(
    async (offset: number, append: boolean, customLimit?: number) => {
      const limit = customLimit ?? COMMENTS_PAGE_SIZE;
      const result = await getPostComments(postId, { limit, offset });
      if (!result.success || !result.data) {
        setCommentsError(result.error || 'Failed to load comments');
        return;
      }
      const { comments, total } = result.data;
      setCommentList((prev) => (append ? [...prev, ...comments] : comments));
      const newOffset = append ? offset + comments.length : comments.length;
      setNextCommentsOffset(newOffset);
      setTotalComments(total);
      setHasMoreComments(newOffset < total && comments.length > 0);
    },
    [postId, COMMENTS_PAGE_SIZE]
  );

  useEffect(() => {
    let active = true;
    const loadComments = async () => {
      setCommentsLoading(true);
      setCommentsError(null);
      await fetchComments(0, false);
      if (!active) return;
      setCommentsLoading(false);
    };
    loadComments();
    return () => {
      active = false;
    };
  }, [postId, fetchComments]);

  const handleCommentSubmit = useCallback(
    async (text: string) => {
      if (!buildingId) {
        toast.error('Building not found for this post');
        return;
      }
      setIsSubmittingComment(true);
      try {
        const result = await createTenantPostComment({ building_id: buildingId, post_id: postId, comment_text: text });
        if (!result.success) {
          toast.error(result.error || 'Failed to add comment');
          return;
        }
        await fetchComments(0, false, Math.max(commentList.length + 1, COMMENTS_PAGE_SIZE));
      } catch (error) {
        console.error('Error submitting comment:', error);
        toast.error('Failed to add comment');
      } finally {
        setIsSubmittingComment(false);
      }
    },
    [postId, buildingId]
  );

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

  const handleShareClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setShareAnchorEl(event.currentTarget);
  }, []);

  const handleShareClose = useCallback(() => {
    setShareAnchorEl(null);
  }, []);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied');
    } catch (err) {
      console.error('Failed to copy link', err);
      toast.error('Unable to copy link');
    } finally {
      handleShareClose();
    }
  }, [shareUrl, handleShareClose]);

  const handleShareWhatsApp = useCallback(() => {
    if (!shareUrl) return;
    const url = `https://wa.me/?text=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    handleShareClose();
  }, [shareUrl, handleShareClose]);

  const handleShareViber = useCallback(() => {
    if (!shareUrl) return;
    const url = `viber://forward?text=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
    handleShareClose();
  }, [shareUrl, handleShareClose]);

  const handleLoadMoreComments = useCallback(async () => {
    if (commentsLoadingMore || !hasMoreComments) return;
    setCommentsLoadingMore(true);
    setCommentsError(null);
    try {
      await fetchComments(nextCommentsOffset, true);
    } catch (err) {
      console.error('Error loading more comments:', err);
      setCommentsError('Unable to load more comments right now.');
    } finally {
      setCommentsLoadingMore(false);
    }
  }, [commentsLoadingMore, hasMoreComments, fetchComments, nextCommentsOffset]);

  // Scroll to a specific comment if requested
  useEffect(() => {
    if (!focusCommentId || !commentList.length) return;
    const el = document.getElementById(`comment-${focusCommentId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusCommentId, commentList]);

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
    <Card
      id={`post-${postId}`}
      sx={{
        border: highlighted ? '2px solid' : undefined,
        borderColor: highlighted ? 'primary.main' : undefined,
        boxShadow: highlighted ? 6 : undefined,
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      }}
      {...other}
    >
      <CardHeader
        avatar={
          <Avatar
            component="a"
            href={authorProfileLink}
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
              {formatDistanceToNowStrict(created_at)} ago
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
              href={authorProfileLink}
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
        {Array.isArray(documents) && documents.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Attachments
            </Typography>
            <Stack spacing={1}>
              {documents
                .filter((doc) => doc.storage_bucket && doc.storage_path)
                .map((doc) => (
                  <AttachmentLink
                    key={`${doc.id || doc.storage_path}-${doc.file_name || ''}`}
                    doc={doc}
                  />
                ))}
            </Stack>
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
            <IconButton onClick={handleShareClick}>
              <SvgIcon>
                <Share07Icon />
              </SvgIcon>
            </IconButton>
          </div>
        </Stack>
        <Divider sx={{ my: 3 }} />
        <Stack spacing={3}>
          {commentsError && (
            <Typography color="error" variant="body2">
              {commentsError}
            </Typography>
          )}
          {commentsLoading ? (
            <Typography variant="body2" color="text.secondary">
              Loading comments...
            </Typography>
          ) :
            commentList.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No comments yet. Be the first to comment!
              </Typography>
            ) :
              (
                <>
                  {commentList.map((comment: TenantPostCommentWithAuthor) => (
                    <SocialComment
                      commentId={comment.id}
                      authorId={comment.author.id}
                      authorAvatar={comment.author.avatar_url || ''}
                      authorName={`${comment.author.first_name || ''} ${comment.author.last_name || ''}`.trim()}
                      created_at={new Date(comment.created_at).getTime()}
                      key={comment.id}
                      message={comment.comment_text}
                      highlighted={focusCommentId === comment.id}
                      reactions={comment.reactions}
                      userReaction={comment.userReaction}
                      onReactionsChange={(payload) => {
                        setCommentList((prev) =>
                          prev.map((c) =>
                            c.id === comment.id
                              ? { ...c, reactions: payload.reactions, userReaction: payload.userReaction }
                              : c
                          )
                        );
                      }}
                    />
                  ))}
                  {hasMoreComments && (
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <ButtonBase
                        onClick={handleLoadMoreComments}
                        disabled={commentsLoadingMore}
                        sx={{
                          mt: 1,
                          px: 2,
                          py: 1,
                          borderRadius: 1,
                          border: (theme) => `1px solid ${theme.palette.divider}`,
                          bgcolor: 'background.paper',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                      >
                        <Typography variant="body2" color="text.primary">
                          {commentsLoadingMore ? 'Loading...' : 'Load more comments'}
                        </Typography>
                      </ButtonBase>
                    </Box>
                  )}
                </>
              )}
        </Stack>
        <Divider sx={{ my: 3 }} />
        <SocialCommentAdd
          onSubmit={handleCommentSubmit}
          currentUserAvatar={currentUserProfile?.avatar_url}
          currentUserName={`${currentUserProfile?.first_name ?? ''} ${currentUserProfile?.last_name ?? ''}`.trim()}
          disabled={isSubmittingComment}
        />
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
      <Popover
        open={Boolean(shareAnchorEl)}
        anchorEl={shareAnchorEl}
        onClose={handleShareClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Stack sx={{ minWidth: 200, p: 1 }}>
          <MenuItem onClick={handleCopyLink}>
            <ListItemIcon>
              <ContentCopyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Copy link" />
          </MenuItem>
          <MenuItem onClick={handleShareWhatsApp}>
            <ListItemIcon>
              <WhatsAppIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText primary="Share via WhatsApp" />
          </MenuItem>
          <MenuItem onClick={handleShareViber}>
            <ListItemIcon>
              <PhoneIphoneIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Share via Viber" />
          </MenuItem>
        </Stack>
      </Popover>
    </Card>
  );
};

SocialPostCard.propTypes = {
  postId: PropTypes.string.isRequired,
  authorId: PropTypes.string.isRequired,
  buildingId: PropTypes.string.isRequired,
  authorAvatar: PropTypes.string.isRequired,
  authorName: PropTypes.string.isRequired,
  comments: PropTypes.array,
  created_at: PropTypes.number.isRequired,
  likes: PropTypes.number,
  media: PropTypes.array,
  documents: PropTypes.array,
  message: PropTypes.string.isRequired,
  isOwner: PropTypes.bool,
  onArchive: PropTypes.func,
  reactions: PropTypes.array,
  userReaction: PropTypes.string,
  onReactionsChange: PropTypes.func,
  currentUserProfile: PropTypes.any,
  highlighted: PropTypes.bool,
};
