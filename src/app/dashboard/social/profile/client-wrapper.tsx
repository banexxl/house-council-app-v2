'use client';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { SocialTimeline } from 'src/sections/dashboard/social/social-timeline';
import type { TenantPost, TenantProfile } from 'src/types/social';

interface ClientProfileWrapperProps {
     posts: TenantPost[];
     profile: TenantProfile;
}

export const ClientProfileWrapper = ({ posts, profile }: ClientProfileWrapperProps) => {
     return (
          <>
               <Box sx={{ mt: 5, mb: 2 }}>
                    <Typography variant="h6" color="text.primary">
                         Timeline
                    </Typography>

               </Box>
               <Divider />
               <Box sx={{ mt: 3 }}>
                    <SocialTimeline
                         posts={posts}
                         profile={profile}
                    />
               </Box>
          </>
     );
};