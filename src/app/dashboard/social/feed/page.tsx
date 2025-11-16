import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Seo } from 'src/components/seo';

import { SocialPostAdd } from 'src/sections/dashboard/social/social-post-add';
import { SocialPostCard } from 'src/sections/dashboard/social/social-post-card';
import { getTenantPosts } from 'src/app/actions/social/post-actions';
import type { TenantPostWithAuthor } from 'src/types/social';

const Page = async () => {
  // Fetch posts server-side
  const postsResult = await getTenantPosts();
  const posts = postsResult.success ? postsResult.data || [] : [];

  return (
    <>
      <Seo title="Dashboard: Social Feed" />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={1}>
            <Typography
              color="text.secondary"
              variant="overline"
            >
              Social Feed
            </Typography>
            <Typography variant="h4">Here&apos;s what your connections posted</Typography>
          </Stack>
          <Stack
            spacing={3}
            sx={{ mt: 3 }}
          >
            {/* <SocialPostAdd user={} buildingId={''} />
            {posts.map((post: TenantPostWithAuthor) => (
              <SocialPostCard
                key={post.id}
                authorAvatar={post.author.avatar_url || ''}
                authorName={`${post.author.first_name || ''} ${post.author.last_name || ''}`.trim()}
                comments={[]} // We'll fetch comments separately when needed
                created_at={new Date(post.created_at).getTime()}
                isLiked={post.is_liked || false}
                likes={post.likes_count || 0}
                media={post.images || []}
                message={post.content_text}
              />
            ))} */}
            {posts.length === 0 && (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 6,
                  color: 'text.secondary'
                }}
              >
                <Typography variant="h6" gutterBottom>
                  No posts yet
                </Typography>
                <Typography variant="body2">
                  Be the first to share something with your community!
                </Typography>
              </Box>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

export default Page;
