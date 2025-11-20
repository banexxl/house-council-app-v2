import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { getCurrentUserProfile } from 'src/app/actions/social/profile-actions';
import { getCurrentUserActivePostsPaginated } from 'src/app/actions/social/post-actions';
import { ClientProfileWrapper } from './client-wrapper';
import { getBuildingIdFromTenantId } from 'src/app/actions/tenant/tenant-actions';

const PROFILE_FEED_PAGE_SIZE = 5;

const Page = async () => {
     // Fetch current user's profile
     const profileResult = await getCurrentUserProfile();
     const profile = profileResult.success ? profileResult.data : null;

     // If no profile exists, show create profile message
     if (!profile) {
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
                                        color: 'text.secondary'
                                   }}
                              >
                                   <Typography variant="h4" gutterBottom>
                                        Create Your Social Profile
                                   </Typography>
                                   <Typography variant="body1" sx={{ mb: 4 }}>
                                        Set up your profile to connect with your community
                                   </Typography>
                                   <Button
                                        variant="contained"
                                        size="large"
                                        href="/dashboard/social/profile/edit"
                                   >
                                        Create Profile
                                   </Button>
                              </Box>
                         </Container>
                    </Box>
               </>
          );
     }

     const { data: buildingId } = await getBuildingIdFromTenantId(profile.tenant_id);
     const postsResult = await getCurrentUserActivePostsPaginated({
          limit: PROFILE_FEED_PAGE_SIZE,
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
                         <ClientProfileWrapper
                              posts={posts}
                              profile={profile}
                              buildingId={buildingId ?? ''}
                              totalCount={totalCount}
                              pageSize={PROFILE_FEED_PAGE_SIZE}
                         />
                    </Container>
               </Box>
          </>
     );
};

export default Page;
