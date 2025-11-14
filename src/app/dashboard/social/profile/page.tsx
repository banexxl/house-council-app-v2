import MessageChatSquareIcon from '@untitled-ui/icons-react/build/esm/MessageChatSquare';
import DotsHorizontalIcon from '@untitled-ui/icons-react/build/esm/DotsHorizontal';
import Image01Icon from '@untitled-ui/icons-react/build/esm/Image01';
import UserPlus02Icon from '@untitled-ui/icons-react/build/esm/UserPlus02';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { blueGrey } from '@mui/material/colors';
import { paths } from 'src/paths';
import { getCurrentUserProfile } from 'src/app/actions/social/profile-actions';
import { getCurrentUserPosts } from 'src/app/actions/social/post-actions';
import { ClientProfileWrapper } from './client-wrapper';

const Page = async () => {
     // Fetch current user's profile
     const profileResult = await getCurrentUserProfile();
     const profile = profileResult.success ? profileResult.data : null;

     // Fetch user's posts
     const postsResult = await getCurrentUserPosts();
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
                                                  <Image01Icon />
                                             </SvgIcon>
                                        }
                                        sx={{
                                             backgroundColor: blueGrey[900],
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
                                                  backgroundColor: blueGrey[900],
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
                                                  <DotsHorizontalIcon />
                                             </SvgIcon>
                                        </IconButton>
                                   </Tooltip>
                              </Stack>
                         </div>

                         {/* Client-side wrapper for tabs functionality */}
                         <ClientProfileWrapper
                              posts={posts}
                              profile={profile}
                         />
                    </Container>
               </Box>
          </>
     );
};

export default Page;