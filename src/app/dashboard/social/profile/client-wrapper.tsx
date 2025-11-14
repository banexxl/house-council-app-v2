'use client';

import { Avatar, Button, IconButton, Stack, SvgIcon, Tooltip, useTheme } from '@mui/material';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import Typography from '@mui/material/Typography';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { paths } from 'src/paths';
import { SocialTimeline } from 'src/sections/dashboard/social/social-timeline';
import type { TenantPostWithAuthor, TenantProfile } from 'src/types/social';
import MessageChatSquareIcon from '@untitled-ui/icons-react/build/esm/MessageChatSquare';

interface ClientProfileWrapperProps {
     posts: TenantPostWithAuthor[];
     profile: TenantProfile;
}

export const ClientProfileWrapper = ({ posts, profile }: ClientProfileWrapperProps) => {

     const theme = useTheme();

     return (
          <>
               <Box sx={{ mt: 5, mb: 2 }}>
                    <div>
                         <Box
                              style={{
                                   backgroundImage: profile.cover_image_url
                                        ? `url(${profile.cover_image_url})`
                                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                              }}
                              sx={{
                                   backgroundPosition: 'center',
                                   backgroundRepeat: 'no-repeat',
                                   backgroundSize: 'cover',
                                   borderRadius: 1,
                                   height: 348,
                                   position: 'relative',
                                   '&:hover': {
                                        '& button': {
                                             visibility: 'visible',
                                        },
                                   },
                              }}
                         >
                              <Button
                                   startIcon={
                                        <SvgIcon>
                                             <AddPhotoAlternateIcon />
                                        </SvgIcon>
                                   }
                                   sx={{
                                        backgroundColor: theme.palette.primary.main,
                                        bottom: {
                                             lg: 24,
                                             xs: 'auto',
                                        },
                                        color: 'common.white',
                                        position: 'absolute',
                                        right: 24,
                                        top: {
                                             lg: 'auto',
                                             xs: 24,
                                        },
                                        visibility: 'hidden',
                                        '&:hover': {
                                             backgroundColor: theme.palette.primary.dark,
                                        },
                                   }}
                                   variant="contained"
                              >
                                   Change Cover
                              </Button>
                         </Box>
                         <Stack
                              alignItems="center"
                              direction="row"
                              spacing={2}
                              sx={{ mt: 5 }}
                         >
                              <Stack
                                   alignItems="center"
                                   direction="row"
                                   spacing={2}
                              >
                                   <Avatar
                                        src={profile.avatar_url || ''}
                                        sx={{
                                             height: 64,
                                             width: 64,
                                        }}
                                   >
                                        {profile.first_name?.charAt(0)?.toUpperCase()}
                                   </Avatar>
                                   <div>
                                        <Typography
                                             color="text.secondary"
                                             variant="overline"
                                        >
                                             {profile.bio || 'No bio yet'}
                                        </Typography>
                                        <Typography variant="h6">{profile.first_name}</Typography>
                                        {profile.current_city && (
                                             <Typography variant="body2" color="text.secondary">
                                                  📍 {profile.current_city}
                                             </Typography>
                                        )}
                                        {profile.current_job_title && (
                                             <Typography variant="body2" color="text.secondary">
                                                  💼 {profile.current_job_title}
                                                  {profile.current_job_company && ` at ${profile.current_job_company}`}
                                             </Typography>
                                        )}
                                   </div>
                              </Stack>
                              <Box sx={{ flexGrow: 1 }} />
                              <Stack
                                   alignItems="center"
                                   direction="row"
                                   spacing={2}
                                   sx={{
                                        display: {
                                             md: 'block',
                                             xs: 'none',
                                        },
                                   }}
                              >
                                   <Button
                                        href="/dashboard/social/profile/edit"
                                        size="small"
                                        variant="outlined"
                                   >
                                        Edit Profile
                                   </Button>
                                   <Button
                                        href={paths.dashboard.chat}
                                        size="small"
                                        startIcon={
                                             <SvgIcon>
                                                  <MessageChatSquareIcon />
                                             </SvgIcon>
                                        }
                                        variant="contained"
                                   >
                                        Messages
                                   </Button>
                              </Stack>
                              <Tooltip title="More options">
                                   <IconButton>
                                        <SvgIcon>
                                             <MoreVertIcon />
                                        </SvgIcon>
                                   </IconButton>
                              </Tooltip>
                         </Stack>
                    </div>
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