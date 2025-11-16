'use client';

import {
     Avatar,
     Button,
     Card,
     CardActionArea,
     Dialog,
     DialogActions,
     DialogContent,
     DialogTitle,
     Grid,
     IconButton,
     Stack,
     SvgIcon,
     Tooltip,
     useTheme,
} from '@mui/material';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import Typography from '@mui/material/Typography';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MessageChatSquareIcon from '@untitled-ui/icons-react/build/esm/MessageChatSquare';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { paths } from 'src/paths';
import { SocialTimeline } from 'src/sections/dashboard/social/social-timeline';
import { updateTenantProfile } from 'src/app/actions/social/profile-actions';
import type { TenantPostWithAuthor, TenantProfile, UpdateTenantProfilePayload } from 'src/types/social';

const COVER_IMAGES = [
     '/assets/covers/abstract-1-4x3-large.png',
     '/assets/covers/abstract-2-4x3-large.png',
     '/assets/covers/business-1-4x3-large.png',
     '/assets/covers/business-2-4x3-large.png',
     '/assets/covers/minimal-1-4x3-large.png',
     '/assets/covers/minimal-2-4x3-large.png',
     '/assets/covers/abstract-1-4x4-large.png',
     '/assets/covers/abstract-2-4x4-large.png',
     '/assets/covers/business-1-4x4-large.png',
     '/assets/covers/business-2-4x4-large.png',
     '/assets/covers/minimal-1-4x4-large.png',
     '/assets/covers/minimal-2-4x4-large.png',
];

interface ClientProfileWrapperProps {
     posts: TenantPostWithAuthor[];
     profile: TenantProfile;
}

export const ClientProfileWrapper = ({ posts, profile }: ClientProfileWrapperProps) => {

     const theme = useTheme();
     const { t } = useTranslation();
     const [isCoverDialogOpen, setIsCoverDialogOpen] = useState(false);
     const [isUpdatingCover, setIsUpdatingCover] = useState(false);
     const [selectedCover, setSelectedCover] = useState(profile.cover_image_url ?? '');

     useEffect(() => {
          setSelectedCover(profile.cover_image_url ?? '');
     }, [profile.cover_image_url]);

     const updateTenantSocialProfile = async (payload: UpdateTenantProfilePayload) => {
          const result = await updateTenantProfile(profile.id, payload);
          if (!result.success) {
               toast.error('Failed to update tenant profile');
          }

          return result;
     };

     const buildCoverPayload = (coverImageUrl: string): UpdateTenantProfilePayload => ({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone_number: profile.phone_number,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          cover_image_url: coverImageUrl,
          current_city: profile.current_city,
          current_job_title: profile.current_job_title,
          current_job_company: profile.current_job_company,
          previous_job_title: profile.previous_job_title,
          previous_job_company: profile.previous_job_company,
          origin_city: profile.origin_city,
          quote: profile.quote,
          is_public: profile.is_public,
     });

     const handleCloseCoverDialog = () => {
          if (!isUpdatingCover) {
               setIsCoverDialogOpen(false);
          }
     };

     const handleCoverSelect = async (coverImageUrl: string) => {
          if (isUpdatingCover) {
               return;
          }

          setIsUpdatingCover(true);
          setSelectedCover(coverImageUrl);

          const payload = buildCoverPayload(coverImageUrl);
          const result = await updateTenantSocialProfile(payload);

          if (result?.success) {
               setIsCoverDialogOpen(false);
          }

          setIsUpdatingCover(false);
     };

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
                                   disabled={isUpdatingCover}
                                   onClick={() => setIsCoverDialogOpen(true)}
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
                                   {t('clients.clientProfileChangeCover')}
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
                                             {profile.bio || t('clients.clientProfileNoBio')}
                                        </Typography>
                                        <Typography variant="h6">{profile.first_name}</Typography>
                                        {profile.current_city && (
                                             <Typography variant="body2" color="text.secondary">
                                                  {t('clients.clientProfileLocation', { city: profile.current_city })}
                                             </Typography>
                                        )}
                                        {profile.current_job_title && (
                                             <Typography variant="body2" color="text.secondary">
                                                  {profile.current_job_company
                                                       ? t('clients.clientProfileJobAtCompany', {
                                                            title: profile.current_job_title,
                                                            company: profile.current_job_company
                                                       })
                                                       : t('clients.clientProfileJob', { title: profile.current_job_title })}
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
                                        {t('clients.clientProfileEdit')}
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
                                        {t('clients.clientProfileMessages')}
                                   </Button>
                              </Stack>
                              <Tooltip title={t('clients.clientProfileMoreOptions')}>
                                   <IconButton>
                                        <SvgIcon>
                                             <MoreVertIcon />
                                        </SvgIcon>
                                   </IconButton>
                              </Tooltip>
                         </Stack>
                    </div>
                    <Typography variant="h6" color="text.primary">
                         {t('clients.clientProfileTimeline')}
                    </Typography>
               </Box>
               <Divider />
               <Box sx={{ mt: 3 }}>
                    <SocialTimeline
                         posts={posts}
                         profile={profile}
                    />
               </Box>
               <Dialog
                    fullWidth
                    maxWidth="md"
                    onClose={handleCloseCoverDialog}
                    open={isCoverDialogOpen}
               >
                    <DialogTitle>{t('clients.clientProfileSelectCover', 'Select cover image')}</DialogTitle>
                    <DialogContent dividers>
                         <Grid container spacing={2}>
                              {COVER_IMAGES.map(imageUrl => (
                                   <Grid
                                        size={{ md: 4, sm: 6, xs: 12 }}
                                        key={imageUrl}
                                   >
                                        <Card
                                             sx={{
                                                  borderColor: selectedCover === imageUrl ? 'primary.main' : 'divider',
                                                  borderWidth: 2,
                                                  borderStyle: 'solid',
                                             }}
                                        >
                                             <CardActionArea
                                                  disabled={isUpdatingCover}
                                                  onClick={() => handleCoverSelect(imageUrl)}
                                             >
                                                  <Box
                                                       sx={{
                                                            backgroundImage: `url(${imageUrl})`,
                                                            backgroundPosition: 'center',
                                                            backgroundSize: 'cover',
                                                            height: 160,
                                                       }}
                                                  />
                                             </CardActionArea>
                                        </Card>
                                   </Grid>
                              ))}
                         </Grid>
                    </DialogContent>
                    <DialogActions>
                         <Button
                              disabled={isUpdatingCover}
                              onClick={handleCloseCoverDialog}
                         >
                              {t('common.cancel', 'Cancel')}
                         </Button>
                    </DialogActions>
               </Dialog>
          </>
     );
};
