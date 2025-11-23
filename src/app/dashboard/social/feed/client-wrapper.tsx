'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import { useSearchParams } from 'next/navigation';

import type { TenantPostWithAuthor, TenantProfile, EmojiReaction } from 'src/types/social';
import { SocialPostCard } from 'src/sections/dashboard/social/social-post-card';

interface ClientFeedWrapperProps {
  posts: TenantPostWithAuthor[];
  profile: TenantProfile;
  buildingId: string;
  totalCount: number;
  pageSize: number;
}

type FeedResponse = {
  posts?: TenantPostWithAuthor[];
  total?: number;
};

export const ClientFeedWrapper = ({ posts, profile, buildingId, totalCount, pageSize }: ClientFeedWrapperProps) => {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [feedPosts, setFeedPosts] = useState<TenantPostWithAuthor[]>(posts);
  const [totalPosts, setTotalPosts] = useState(totalCount);
  const [nextOffset, setNextOffset] = useState(posts.length);
  const [hasMore, setHasMore] = useState(posts.length < totalCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const targetPostId = searchParams.get('postId');
  const targetCommentId = searchParams.get('commentId');

  useEffect(() => {
    setFeedPosts(posts);
    setTotalPosts(totalCount);
    setNextOffset(posts.length);
    setHasMore(posts.length < totalCount);
  }, [posts, totalCount]);

  useEffect(() => {
    setHasMore(nextOffset < totalPosts);
  }, [nextOffset, totalPosts]);

  // Scroll to post if postId is provided in query params (e.g., from notifications)
  useEffect(() => {
    if (!targetPostId) return;
    const postExists = feedPosts.some((p) => p.id === targetPostId);
    if (!postExists) return;
    const el = document.getElementById(`post-${targetPostId}`);
    if (el) {
      setHighlightedPostId(targetPostId);
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      const timer = setTimeout(() => setHighlightedPostId(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [feedPosts, targetPostId]);

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return feedPosts;
    return feedPosts.filter((post) => {
      const name = `${post.author.first_name || ''} ${post.author.last_name || ''}`.toLowerCase();
      return name.includes(query);
    });
  }, [feedPosts, searchQuery]);

  const handlePostArchived = useCallback((postId: string) => {
    setFeedPosts((prev) => prev.filter((post) => post.id !== postId));
    setTotalPosts((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleReactionsChange = useCallback(
    (postId: string, payload: { reactions: EmojiReaction[]; userReaction: string | null }) => {
      setFeedPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
              ...post,
              reactions: payload.reactions,
              userReaction: payload.userReaction ?? undefined,
              likes_count: payload.reactions.reduce((sum, reaction) => sum + reaction.count, 0),
            }
            : post
        )
      );
    },
    []
  );

  const fetchMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: nextOffset.toString(),
      });
      if (buildingId) {
        params.set('buildingId', buildingId);
      }

      const response = await fetch(`/api/social/feed?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data: FeedResponse = await response.json();
      const newPosts = data.posts ?? [];
      const updatedOffset = nextOffset + newPosts.length;
      const updatedTotal = typeof data.total === 'number' ? data.total : totalPosts;

      setFeedPosts((prev) => [...prev, ...newPosts]);
      setNextOffset(updatedOffset);
      setTotalPosts(updatedTotal);
      setHasMore(updatedOffset < updatedTotal && newPosts.length > 0);
    } catch (error) {
      console.error('Error loading more posts', error);
      setLoadError('Unable to load more posts right now.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [buildingId, hasMore, isLoadingMore, nextOffset, pageSize, totalPosts]);

  useEffect(() => {
    if (!hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          fetchMorePosts();
        }
      },
      { rootMargin: '200px' }
    );

    const target = loadMoreRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [fetchMorePosts, hasMore]);

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <TextField
          label="Search by author"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            width: {
              xs: '60%', // full width on mobile
              sm: 400,    // fixed width on small screens and up
            },
          }}
        />
        <Box sx={{}}>
          <a href="/dashboard/social/profile" style={{ textDecoration: 'none' }}>
            <Box
              component="button"
              sx={{
                px: 2,
                py: 1,
                borderRadius: 1,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500,
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
            >
              Add post
            </Box>
          </a>
        </Box>
      </Box>
      {feedPosts.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            color: 'text.secondary',
            border: (theme) => `1px dashed ${theme.palette.divider}`,
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" gutterBottom>
            No posts yet
          </Typography>
          <Typography variant="body2">
            Be the first to share something with your community!
          </Typography>
        </Box>
      ) : (
        <>
          {filteredPosts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No posts match your search.
            </Typography>
          ) : (
            filteredPosts.map((post) => (
              <SocialPostCard
                key={post.id}
                postId={post.id}
                buildingId={post.building_id || null}
                highlighted={highlightedPostId === post.id}
                focusCommentId={targetCommentId && targetPostId === post.id ? targetCommentId : null}
                authorAvatar={post.author.avatar_url || ''}
                authorName={`${post.author.first_name || ''} ${post.author.last_name || ''}`.trim()}
                created_at={new Date(post.created_at).getTime()}
                likes={post.likes_count || 0}
                media={post.images || []}
                documents={post.documents || []}
                message={post.content_text}
                isOwner={post.tenant_id === profile.tenant_id}
                onArchive={() => handlePostArchived(post.id)}
                reactions={post.reactions || []}
                userReaction={post.userReaction}
                onReactionsChange={(payload) => handleReactionsChange(post.id, payload)}
                currentUserProfile={profile}
              />
            ))
          )}

          {loadError && (
            <Typography color="error" variant="body2">
              {loadError}
            </Typography>
          )}

          {(hasMore || isLoadingMore) && filteredPosts.length > 0 && (
            <Box
              ref={loadMoreRef}
              sx={{ display: 'flex', justifyContent: 'center', py: 2 }}
            >
              {isLoadingMore ? (
                <CircularProgress size={20} />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Scroll to load more posts
                </Typography>
              )}
            </Box>
          )}
        </>
      )}
    </Stack>
  );
};
