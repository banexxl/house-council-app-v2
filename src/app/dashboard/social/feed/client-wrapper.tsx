'use client';

import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';

import type { TenantPostWithAuthor, TenantProfile, EmojiReaction } from 'src/types/social';
import { SocialPostAdd } from 'src/sections/dashboard/social/social-post-add';
import { SocialPostCard } from 'src/sections/dashboard/social/social-post-card';

interface ClientFeedWrapperProps {
  posts: TenantPostWithAuthor[];
  profile: TenantProfile;
  buildingId: string;
}

export const ClientFeedWrapper = ({ posts, profile, buildingId }: ClientFeedWrapperProps) => {
  const router = useRouter();
  const [feedPosts, setFeedPosts] = useState<TenantPostWithAuthor[]>(posts);

  useEffect(() => {
    setFeedPosts(posts);
  }, [posts]);

  const handlePostCreated = useCallback(() => {
    router.refresh();
  }, [router]);

  const handlePostArchived = useCallback((postId: string) => {
    setFeedPosts((prev) => prev.filter((post) => post.id !== postId));
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

  return (
    <Stack spacing={3}>

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
        feedPosts.map((post) => (
          <SocialPostCard
            key={post.id}
            postId={post.id}
            authorAvatar={post.author.avatar_url || ''}
            authorName={`${post.author.first_name || ''} ${post.author.last_name || ''}`.trim()}
            comments={[]}
            createdAt={new Date(post.created_at).getTime()}
            likes={post.likes_count || 0}
            media={post.images || []}
            message={post.content_text}
            isOwner={post.tenant_id === profile.tenant_id}
            onArchive={() => handlePostArchived(post.id)}
            reactions={post.reactions || []}
            userReaction={post.userReaction}
            onReactionsChange={(payload) => handleReactionsChange(post.id, payload)}
          />
        ))
      )}
    </Stack>
  );
};
