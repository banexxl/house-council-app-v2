import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { getCurrentUserProfile, getTenantProfile, getTenantProfileByTenantId } from 'src/app/actions/social/profile-actions';
import { getActivePostsPaginatedByProfileId } from 'src/app/actions/social/post-actions';
import { ClientProfileWrapper } from './client-wrapper';
import { getBuildingIdFromTenantId } from 'src/app/actions/tenant/tenant-actions';
import { logout } from 'src/app/auth/actions';
import { getViewer } from 'src/libs/supabase/server-auth';

const PROFILE_FEED_PAGE_SIZE = 5;

export async function ProfilePageContent({ profileId }: { profileId?: string }) {
     // Fetch viewer (needed for ownership checks)
     const { client, clientMember, tenant, admin } = await getViewer();
     // const client_id = client ? client.id : clientMember ? clientMember.client_id : null;
     const viewerTenantId = tenant?.id ?? null;

     if (!client && !clientMember && !tenant && !admin) {
          await logout();
     }

     let profile = null;
     if (profileId) {
          const profileResult = await getTenantProfile(profileId);
          if (profileResult.success) {
               profile = profileResult.data;
          } else {
               const fallback = await getTenantProfileByTenantId(profileId);
               if (fallback.success) {
                    profile = fallback.data;
               }
          }
     } else {
          const profileResult = await getCurrentUserProfile();
          profile = profileResult.success ? profileResult.data : null;
     }

     const viewerProfileResult = await getCurrentUserProfile();
     const viewerProfile = viewerProfileResult.success ? viewerProfileResult.data : null;

     // If no profile exists, show message
     if (!profile) {
          return (
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
                                   {profileId ? 'Profile not found' : 'Create Your Social Profile'}
                              </Typography>
                              <Typography variant="body1" sx={{ mb: 4 }}>
                                   {profileId
                                        ? 'The requested profile could not be found.'
                                        : 'Set up your profile to connect with your community'}
                              </Typography>
                              {!profileId && (
                                   <Button
                                        variant="contained"
                                        size="large"
                                        href="/dashboard/social/profile/edit"
                                   >
                                        Create Profile
                                   </Button>
                              )}
                         </Box>
                    </Container>
               </Box>
          );
     }

     const { data: buildingId } = await getBuildingIdFromTenantId(profile.tenant_id);
     const postsResult = await getActivePostsPaginatedByProfileId({
          profileId: profile.id,
          limit: PROFILE_FEED_PAGE_SIZE,
          offset: 0,
     });
     const posts = postsResult.success ? postsResult.data?.posts || [] : [];
     const totalCount = postsResult.success ? postsResult.data?.total || posts.length : posts.length;
     const isOwner = viewerTenantId === profile.tenant_id;

     return (
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
                         isOwner={isOwner}
                         currentUserProfile={viewerProfile ?? profile}
                    />
               </Container>
          </Box>
     );
}

const Page = async () => {
     return <ProfilePageContent />;
};

export default Page;
