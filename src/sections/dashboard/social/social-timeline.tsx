'use client'

import type { FC } from 'react';
import { Grid } from '@mui/material';
import Stack from '@mui/material/Stack';

import type { TenantPostWithAuthor, TenantProfile } from 'src/types/social';

import { SocialPostAdd } from './social-post-add';
import { SocialPostCard } from './social-post-card';
import { SocialAbout } from './social-about';

interface SocialProfileTimelineProps {
  posts?: TenantPostWithAuthor[];
  profile: TenantProfile;
}

export const SocialTimeline: FC<SocialProfileTimelineProps> = (props) => {
  const { posts = [], profile, ...other } = props;

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
            email={profile.phone_number || ''}
            originCity={profile.origin_city || ''}
            previousJobCompany={profile.previous_job_company || ''}
            previousJobTitle={profile.previous_job_title || ''}
            profileProgress={profile.profile_progress || 0}
            quote={profile.quote || ''}
          />
        </Grid>
        <Grid
          size={{ xs: 12, lg: 8 }}
        >
          <Stack spacing={3}>
            <SocialPostAdd />
            {posts.map((post) => (
              <SocialPostCard
                key={post.id}
                authorAvatar={post.author.avatar_url || ''}
                authorName={`${post.author.first_name || ''} ${post.author.last_name || ''}`.trim()}
                comments={[]} // Comments would need to be fetched separately
                created_at={new Date(post.created_at).getTime()}
                isLiked={post.is_liked || false}
                likes={post.likes_count}
                media={post.image_url}
                message={post.content_text}
              />
            ))}
          </Stack>
        </Grid>
      </Grid>
    </div>
  );
};
