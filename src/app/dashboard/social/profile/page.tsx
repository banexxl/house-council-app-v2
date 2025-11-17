import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { getCurrentUserProfile } from 'src/app/actions/social/profile-actions';
import { getCurrentUserActivePosts } from 'src/app/actions/social/post-actions';
import { ClientProfileWrapper } from './client-wrapper';
import { getBuildingIdFromTenantId } from 'src/app/actions/tenant/tenant-actions';

const Page = async () => {
     // Fetch current user's profile
     const profileResult = await getCurrentUserProfile();
     const profile = profileResult.success ? profileResult.data : null;

     // Fetch user's posts
     const postsResult = await getCurrentUserActivePosts();
     const posts = postsResult.success ? postsResult.data || [] : [];
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
                              buildingId={buildingId!}
                         />
                    </Container>
               </Box>
          </>
     );
};

export default Page;