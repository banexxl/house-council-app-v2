import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';

import { Seo } from 'src/components/seo';
import { getTenantPostsPaginated } from 'src/app/actions/social/post-actions';
import { getCurrentUserProfile } from 'src/app/actions/social/profile-actions';
import { getBuildingIdFromTenantId } from 'src/app/actions/tenant/tenant-actions';

import { ClientFeedWrapper } from './client-wrapper';
import { getViewer } from 'src/libs/supabase/server-auth';

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
        <Seo title="Dashboard: Social Feed" />
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
              <Typography variant="body1" sx={{ mb: 4 }}>
                Profile does not exist.
              </Typography>
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
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 0.5 }}>
              <Link color="inherit" href="/dashboard">
                Dashboard
              </Link>
              <Typography color="text.primary">Social Feed</Typography>
            </Breadcrumbs>
            <Typography variant="h4">Here&apos;s what your connections posted</Typography>
          </Stack>
          <Stack
            spacing={3}
            sx={{ mt: 3 }}
          >
            <ClientFeedWrapper
              posts={posts}
              profile={profile ? profile : null}
              client={viewer.client ? viewer.client : viewer.clientMember ? viewer.clientMember : null}
              buildingId={buildingId ?? ''}
              totalCount={totalCount}
              pageSize={FEED_PAGE_SIZE}
            />
          </Stack>
        </Container>
      </Box>
    </>
  );
};

export default Page;
