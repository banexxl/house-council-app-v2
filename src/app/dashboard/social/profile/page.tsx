import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { getCurrentUserProfile, getTenantProfile, getTenantProfileByTenantId } from 'src/app/actions/social/profile-actions';
import { getActivePostsPaginatedByProfileId } from 'src/app/actions/social/post-actions';
import { ClientProfileWrapper } from './client-wrapper';
import { getBuildingIdFromTenantId } from 'src/app/actions/tenant/tenant-actions';
import { getViewer } from 'src/libs/supabase/server-auth';
import { getClientBuildingsForSocialProfile, type ClientBuildingOption } from 'src/app/actions/client/client-actions';
import type { TenantProfile } from 'src/types/social';
import log from 'src/utils/logger';

const PROFILE_FEED_PAGE_SIZE = 5;

export async function ProfilePageContent({ profileId }: { profileId?: string }) {
     // Fetch viewer (needed for ownership checks)
     const { client, clientMember, tenant, admin } = await getViewer();
     // const client_id = client ? client.id : clientMember ? clientMember.client_id : null;
     const viewerTenantId = tenant?.id ?? null;
     const viewerClientId = client?.id ?? clientMember?.client_id ?? null;

     if (!client && !clientMember && !tenant && !admin) {
          return null;
     }

     let clientBuildings: ClientBuildingOption[] = [];
     if (viewerClientId) {
          const buildingsResult = await getClientBuildingsForSocialProfile(viewerClientId);
          clientBuildings = buildingsResult.success ? buildingsResult.data ?? [] : [];
     }

     let profile: TenantProfile | null = null;
     if (profileId) {
          const profileResult = await getTenantProfile(profileId);
          if (profileResult.success) {
               profile = profileResult.data!;
          } else {
               const fallback = await getTenantProfileByTenantId(profileId);
               if (fallback.success) {
                    profile = fallback.data!;
               }
          }
     } else {
          const profileResult = await getCurrentUserProfile();
          profile = profileResult.success ? profileResult.data! : null;
     }
     log('Loaded profile page for profileId: ' + profileId + ', resolved profile id: ' + (JSON.stringify(profile)));
     const viewerProfileResult = await getCurrentUserProfile();
     const viewerProfile = viewerProfileResult.success ? viewerProfileResult.data : null;

     // Build a read-only profile for clients/client members if none exists in tenant profiles
     if (!profile && (client || clientMember) && viewerClientId) {
          const now = new Date().toISOString();
          profile = {
               id: viewerClientId,
               tenant_id: null,
               first_name: client?.contact_person || client?.name || clientMember?.name || '',
               last_name: '',
               email: client?.email || clientMember?.email || '',
               phone_number: client?.phone || client?.mobile_phone || '',
               bio: '',
               avatar_url: client?.avatar || '',
               cover_image_url: '',
               current_city: '',
               current_job_title: '',
               current_job_company: '',
               previous_job_title: '',
               previous_job_company: '',
               origin_city: '',
               quote: '',
               created_at: now,
               updated_at: now,
               client_id: viewerClientId,
          } as unknown as TenantProfile;
     }

     // Fallback placeholder to keep UI stable for other roles (e.g., admin)
     if (!profile) {
          const now = new Date().toISOString();
          profile = {
               id: profileId ?? 'unknown-profile',
               tenant_id: null,
               first_name: '',
               last_name: '',
               created_at: now,
               updated_at: now,
          } as unknown as TenantProfile;
     }

     const { data: buildingId } = profile.tenant_id ? await getBuildingIdFromTenantId(profile.tenant_id) : { data: null as string | null };
     const resolvedBuildingId = buildingId ?? clientBuildings[0]?.id ?? '';
     const postsResult = await getActivePostsPaginatedByProfileId({
          profileId: profile.id,
          limit: PROFILE_FEED_PAGE_SIZE,
          offset: 0,
     });
     const posts = postsResult.success ? postsResult.data?.posts || [] : [];
     const totalCount = postsResult.success ? postsResult.data?.total || posts.length : posts.length;
     const isOwner = Boolean(profile.tenant_id && viewerTenantId === profile.tenant_id);

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
                         buildingId={resolvedBuildingId}
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
