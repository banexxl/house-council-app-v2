import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { getTenantPostsPaginated } from 'src/app/actions/social/post-actions';
import { getCurrentUserProfile } from 'src/app/actions/social/profile-actions';
import { getBuildingIdFromTenantId } from 'src/app/actions/tenant/tenant-actions';

import { ClientFeedWrapper } from './client-wrapper';
import { getViewer } from 'src/libs/supabase/server-auth';
import { FeedPageHeader } from './client-header';
import { FeedProfileMissing } from './client-profile-missing';
import { Suspense } from 'react';
import { DefaultPageSkeleton } from 'src/sections/dashboard/skeletons/default-page-skeleton';

const FEED_PAGE_SIZE = 5;

const Page = async () => {
  const [profileResult, viewer] = await Promise.all([
    getCurrentUserProfile(),
    getViewer(),
  ]);
  const profile = profileResult.success ? profileResult.data : null;
  if (!profile && !viewer.admin && !viewer.client && !viewer.clientMember) {
    return (
      <>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            py: 8,
          }}
        >
          <Container maxWidth="lg">
            <Box
              sx={{
                textAlign: 'center',
                py: 6,
                color: 'text.secondary',
              }}
            >
              <FeedProfileMissing />
            </Box>
          </Container>
        </Box>
      </>
    );
  }

  const { data: buildingId } = await getBuildingIdFromTenantId(profile?.tenant_id!);
  const postsResult = await getTenantPostsPaginated({
    buildingId: buildingId ?? undefined,
    limit: FEED_PAGE_SIZE,
    offset: 0,
  });
  const posts = postsResult.success ? postsResult.data?.posts || [] : [];
  const totalCount = postsResult.success ? postsResult.data?.total || posts.length : posts.length;

  return (
    <>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          <FeedPageHeader />
          <Stack
            spacing={3}
            sx={{ mt: 3 }}
          >
            <Suspense fallback={<DefaultPageSkeleton />}>
              <ClientFeedWrapper
                posts={posts}
                profile={profile ? profile : null}
                client={viewer.client ? viewer.client : viewer.clientMember ? viewer.clientMember : null}
                buildingId={buildingId ?? ''}
                totalCount={totalCount}
                pageSize={FEED_PAGE_SIZE}
              />
            </Suspense>
          </Stack>
        </Container>
      </Box>
    </>
  );
};

export default Page;
