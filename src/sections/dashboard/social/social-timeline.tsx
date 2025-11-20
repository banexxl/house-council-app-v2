'use client'

import type { FC } from 'react';
import { useMemo } from 'react';
import { Grid } from '@mui/material';
import Stack from '@mui/material/Stack';

import type { TenantPostWithAuthor, TenantProfile } from 'src/types/social';

import { SocialPostAdd } from './social-post-add';
import { SocialPostCard } from './social-post-card';
import { SocialAbout } from './social-about';

interface SocialProfileTimelineProps {
  posts?: TenantPostWithAuthor[];
  profile: TenantProfile;
  buildingId: string;
}

export const SocialTimeline: FC<SocialProfileTimelineProps> = (props) => {

  const { posts = [], profile, buildingId, ...other } = props;
  console.log('posts', posts);

  const profileProgress = useMemo(() => {
    const trackedFields: Array<keyof TenantProfile> = [
      'first_name',
      'last_name',
      'phone_number',
      'bio',
      'avatar_url',
      'cover_image_url',
      'current_city',
      'current_job_title',
      'current_job_company',
      'previous_job_title',
      'previous_job_company',
      'origin_city',
      'quote',
    ];

    const completedFields = trackedFields.filter((field) => {
      const value = profile[field];
      return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
    });

    return Math.round((completedFields.length / trackedFields.length) * 100);
  }, [profile]);

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
            email={profile.email || ''}
            originCity={profile.origin_city || ''}
            previousJobCompany={profile.previous_job_company || ''}
            previousJobTitle={profile.previous_job_title || ''}
            profileProgress={profileProgress}
            phoneNumber={profile.phone_number || ''}
            quote={profile.quote || ''}
            dateOfBirth={profile.date_of_birth || ''}
          />
        </Grid>
        <Grid
          size={{ xs: 12, lg: 8 }}
        >
          <Stack spacing={3}>
            <SocialPostAdd user={profile} buildingId={buildingId} />
            {posts.map((post) => (
              <SocialPostCard
                key={post.id}
                postId={post.id!}
                authorAvatar={post.author.avatar_url || ''}
                authorName={`${post.author.first_name || ''} ${post.author.last_name || ''}`.trim()}
                comments={[]} // Comments would need to be fetched separately
                createdAt={new Date(post.created_at).getTime()}
                likes={post.likes_count! || 0}
                media={post.images || []}
                message={post.content_text}
                isOwner={post.tenant_id === profile.tenant_id}
                reactions={post.reactions || []}
                userReaction={post.userReaction}
              />
            ))}
          </Stack>
        </Grid>
      </Grid>
    </div>
  );
};
