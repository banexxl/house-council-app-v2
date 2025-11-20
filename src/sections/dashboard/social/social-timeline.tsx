'use client'

import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Grid, Box, CircularProgress, Typography } from '@mui/material';
import Stack from '@mui/material/Stack';

import type { EmojiReaction, TenantPostWithAuthor, TenantProfile } from 'src/types/social';

import { SocialPostAdd } from './social-post-add';
import { SocialPostCard } from './social-post-card';
import { SocialAbout } from './social-about';

interface SocialProfileTimelineProps {
  posts?: TenantPostWithAuthor[];
  profile: TenantProfile;
  buildingId: string;
  totalCount: number;
  pageSize: number;
}

export const SocialTimeline: FC<SocialProfileTimelineProps> = (props) => {

  const { posts = [], profile, buildingId, totalCount, pageSize, ...other } = props;
  const profileProgress = useMemo(() => {
    const trackedFields: Array<keyof TenantProfile> = [
      'first_name',
      'last_name',
      'phone_number',
      'bio',
      'avatar_url',
      'cover_image_url',
      'current_city',
      'current_job_title',
      'current_job_company',
      'previous_job_title',
      'previous_job_company',
      'origin_city',
      'quote',
    ];

    const completedFields = trackedFields.filter((field) => {
      const value = profile[field];
      return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
    });

    return Math.round((completedFields.length / trackedFields.length) * 100);
  }, [profile]);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [feedPosts, setFeedPosts] = useState<TenantPostWithAuthor[]>(posts);
  const [totalPosts, setTotalPosts] = useState(totalCount);
  const [nextOffset, setNextOffset] = useState(posts.length);
  const [hasMore, setHasMore] = useState(posts.length < totalCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setFeedPosts(posts);
    setTotalPosts(totalCount);
    setNextOffset(posts.length);
    setHasMore(posts.length < totalCount);
  }, [posts, totalCount]);

  useEffect(() => {
    setHasMore(nextOffset < totalPosts);
  }, [nextOffset, totalPosts]);

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

  const fetchPage = useCallback(
    async (offset: number, append: boolean) => {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: offset.toString(),
      });

      const response = await fetch(`/api/social/profile-feed?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      const newPosts: TenantPostWithAuthor[] = data.posts ?? [];
      const updatedTotal = typeof data.total === 'number' ? data.total : totalPosts;
      const updatedOffset = append ? offset + newPosts.length : newPosts.length;

      setFeedPosts((prev) => (append ? [...prev, ...newPosts] : newPosts));
      setNextOffset(updatedOffset);
      setTotalPosts(updatedTotal);
      setHasMore(updatedOffset < updatedTotal && newPosts.length > 0);
    },
    [pageSize, totalPosts]
  );

  const fetchMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }
    setIsLoadingMore(true);
    setLoadError(null);
    try {
      await fetchPage(nextOffset, true);
    } catch (error) {
      console.error('Error loading more posts', error);
      setLoadError('Unable to load more posts right now.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchPage, hasMore, isLoadingMore, nextOffset]);

  const refreshPosts = useCallback(async () => {
    setIsRefreshing(true);
    setLoadError(null);
    try {
      await fetchPage(0, false);
    } catch (error) {
      console.error('Error refreshing posts', error);
      setLoadError('Unable to refresh posts right now.');
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchPage]);

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
    <div {...other}>
      <Grid
        container
        spacing={4}
      >
        <Grid
          size={{ xs: 12, lg: 4 }}
        >
          <SocialAbout
            currentCity={profile.current_city || ''}
            currentJobCompany={profile.current_job_company || ''}
            currentJobTitle={profile.current_job_title || ''}
            email={profile.email || ''}
            originCity={profile.origin_city || ''}
            previousJobCompany={profile.previous_job_company || ''}
            previousJobTitle={profile.previous_job_title || ''}
            profileProgress={profileProgress}
            phoneNumber={profile.phone_number || ''}
            quote={profile.quote || ''}
            dateOfBirth={profile.date_of_birth || ''}
          />
        </Grid>
        <Grid
          size={{ xs: 12, lg: 8 }}
        >
          <Stack spacing={3}>
            <SocialPostAdd user={profile} buildingId={buildingId} onPostCreated={refreshPosts} />
            {feedPosts.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 4,
                  color: 'text.secondary',
                  border: (theme) => `1px dashed ${theme.palette.divider}`,
                  borderRadius: 2,
                }}
              >
                <Typography variant="subtitle1">No posts yet</Typography>
                <Typography variant="body2">Share something to get started.</Typography>
              </Box>
            ) : (
              <>
                {feedPosts.map((post) => (
                  <SocialPostCard
                    key={post.id}
                    postId={post.id!}
                    authorAvatar={post.author.avatar_url || ''}
                    authorName={`${post.author.first_name || ''} ${post.author.last_name || ''}`.trim()}
                    created_at={new Date(post.created_at).getTime()}
                    likes={post.likes_count! || 0}
                    media={post.images || []}
                    documents={post.documents || []}
                    message={post.content_text}
                    isOwner={post.tenant_id === profile.tenant_id}
                    reactions={post.reactions || []}
                    userReaction={post.userReaction}
                    onArchive={() => handlePostArchived(post.id!)}
                    onReactionsChange={(payload) => handleReactionsChange(post.id!, payload)}
                    currentUserProfile={profile}
                  />
                ))}

                {loadError && (
                  <Typography color="error" variant="body2">
                    {loadError}
                  </Typography>
                )}

                {(hasMore || isLoadingMore) && (
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
        </Grid>
      </Grid>
    </div>
  );
};
