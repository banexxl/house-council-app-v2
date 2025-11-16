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
     TextField,
     Tooltip,
     useTheme,
} from '@mui/material';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import Typography from '@mui/material/Typography';
import MessageChatSquareIcon from '@untitled-ui/icons-react/build/esm/MessageChatSquare';
import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { paths } from 'src/paths';
import { SocialTimeline } from 'src/sections/dashboard/social/social-timeline';
import { updateTenantProfile } from 'src/app/actions/social/profile-actions';
import { AVATAR_IMAGES, COVER_IMAGES, type TenantPostWithAuthor, type TenantProfile, type UpdateTenantProfilePayload } from 'src/types/social';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';


interface socialProfileWrapperProps {
     posts: TenantPostWithAuthor[];
     profile: TenantProfile;
     buildingId: string;
}

export const ClientProfileWrapper = ({ posts, profile, buildingId }: socialProfileWrapperProps) => {

     const theme = useTheme();
     const { t } = useTranslation();
     const [isCoverDialogOpen, setIsCoverDialogOpen] = useState(false);
     const [isUpdatingCover, setIsUpdatingCover] = useState(false);
     const [selectedCover, setSelectedCover] = useState(profile.cover_image_url ?? '');
     const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
     const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
     const [selectedAvatar, setSelectedAvatar] = useState(profile.avatar_url ?? '');
     const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
     const [isUpdatingProfileData, setIsUpdatingProfileData] = useState(false);
     const [profileFormValues, setProfileFormValues] = useState<UpdateTenantProfilePayload>(() => ({
          bio: profile.bio ?? '',
          phone_number: profile.phone_number ?? '',
          date_of_birth: profile.date_of_birth ?? '',
          current_city: profile.current_city ?? '',
          current_job_title: profile.current_job_title ?? '',
          current_job_company: profile.current_job_company ?? '',
          previous_job_title: profile.previous_job_title ?? '',
          previous_job_company: profile.previous_job_company ?? '',
          origin_city: profile.origin_city ?? '',
          quote: profile.quote ?? '',
     }));

     useEffect(() => {
          setSelectedCover(profile.cover_image_url ?? '');
     }, [profile.cover_image_url]);

     useEffect(() => {
          setSelectedAvatar(profile.avatar_url ?? '');
     }, [profile.avatar_url]);

     useEffect(() => {
          setProfileFormValues({
               bio: profile.bio ?? '',
               phone_number: profile.phone_number ?? '',
               date_of_birth: profile.date_of_birth ?? '',
               current_city: profile.current_city ?? '',
               current_job_title: profile.current_job_title ?? '',
               current_job_company: profile.current_job_company ?? '',
               previous_job_title: profile.previous_job_title ?? '',
               previous_job_company: profile.previous_job_company ?? '',
               origin_city: profile.origin_city ?? '',
               quote: profile.quote ?? '',
          });
     }, [
          profile.bio,
          profile.phone_number,
          profile.date_of_birth,
          profile.current_city,
          profile.current_job_title,
          profile.current_job_company,
          profile.previous_job_title,
          profile.previous_job_company,
          profile.origin_city,
          profile.quote,
     ]);

     const updateTenantSocialProfile = async (payload: UpdateTenantProfilePayload) => {
          const result = await updateTenantProfile(profile.id, payload);
          if (!result.success) {
               toast.error(t('tenants.socialProfileUpdateFailed'));
          }
          toast.success(t('tenants.socialProfileUpdated'));
          return result;
     };

     const buildProfilePayload = (overrides: Partial<UpdateTenantProfilePayload> = {}): UpdateTenantProfilePayload => ({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone_number: profile.phone_number,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          cover_image_url: profile.cover_image_url,
          current_city: profile.current_city,
          current_job_title: profile.current_job_title,
          current_job_company: profile.current_job_company,
          previous_job_title: profile.previous_job_title,
          previous_job_company: profile.previous_job_company,
          origin_city: profile.origin_city,
          quote: profile.quote,
          ...overrides,
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

          const payload = buildProfilePayload({ cover_image_url: coverImageUrl });
          const result = await updateTenantSocialProfile(payload);

          if (result?.success) {
               setIsCoverDialogOpen(false);
          }

          setIsUpdatingCover(false);
     };

     const handleCloseAvatarDialog = () => {
          if (!isUpdatingAvatar) {
               setIsAvatarDialogOpen(false);
          }
     };

     const handleAvatarSelect = async (avatarUrl: string) => {
          if (isUpdatingAvatar) {
               return;
          }

          setIsUpdatingAvatar(true);
          setSelectedAvatar(avatarUrl);

          const payload = buildProfilePayload({ avatar_url: avatarUrl });
          const result = await updateTenantSocialProfile(payload);

          if (result?.success) {
               setIsAvatarDialogOpen(false);
          }

          setIsUpdatingAvatar(false);
     };

     const handleProfileFieldChange = (field: keyof UpdateTenantProfilePayload) => (
          event: ChangeEvent<HTMLInputElement>
     ) => {
          const value = event.target.value;
          setProfileFormValues(prev => ({
               ...prev,
               [field]: value,
          }));
     };

     const handleCloseProfileDialog = () => {
          if (!isUpdatingProfileData) {
               setIsProfileDialogOpen(false);
          }
     };

     const handleProfileDataSave = async () => {
          if (isUpdatingProfileData) {
               return;
          }

          setIsUpdatingProfileData(true);
          const payload = buildProfilePayload(profileFormValues);
          const result = await updateTenantSocialProfile(payload);

          if (result?.success) {
               setIsProfileDialogOpen(false);
          }

          setIsUpdatingProfileData(false);
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
                                   {t('tenants.socialProfileChangeCover')}
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
                                   <Tooltip title={t('tenants.socialProfileChangeAvatar', 'Change avatar')}>
                                        <IconButton
                                             onClick={() => setIsAvatarDialogOpen(true)}
                                             disabled={isUpdatingAvatar}
                                             sx={{
                                                  p: 0,
                                                  '&:hover': {
                                                       opacity: 0.8,
                                                  },
                                             }}
                                        >
                                             <Avatar
                                                  src={profile.avatar_url || ''}
                                                  sx={{
                                                       height: 64,
                                                       width: 64,
                                                       cursor: 'pointer',
                                                  }}
                                             >
                                                  {profile.first_name?.charAt(0)?.toUpperCase()}
                                             </Avatar>
                                        </IconButton>
                                   </Tooltip>
                                   <div>
                                        <Typography
                                             color="text.secondary"
                                             variant="overline"
                                        >
                                             {profile.bio || t('tenants.socialProfileNoBio')}
                                        </Typography>
                                        <Typography variant="h6">{profile.first_name}</Typography>
                                        {profile.current_city && (
                                             <Typography variant="body2" color="text.secondary">
                                                  {t('tenants.socialProfileLocation', { city: profile.current_city })}
                                             </Typography>
                                        )}
                                        {profile.current_job_title && (
                                             <Typography variant="body2" color="text.secondary">
                                                  {profile.current_job_company
                                                       ? t('tenants.socialProfileJobAtCompany', {
                                                            title: profile.current_job_title,
                                                            company: profile.current_job_company
                                                       })
                                                       : t('tenants.socialProfileJob', { title: profile.current_job_title })}
                                             </Typography>
                                        )}
                                   </div>
                              </Stack>
                              <Box sx={{ flexGrow: 1 }} />
                              <Stack
                                   alignItems="center"
                                   direction="row"
                                   spacing={1}
                                   sx={{
                                        flexWrap: 'wrap',
                                        gap: 1,
                                   }}
                              >
                                   <Button
                                        disabled={isUpdatingProfileData}
                                        onClick={() => setIsProfileDialogOpen(true)}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                             minWidth: { xs: 'auto', sm: 120 },
                                             px: { xs: 1.5, sm: 2 },
                                        }}
                                   >
                                        {t('tenants.socialProfileModifyData', 'Modify profile data')}
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
                                        sx={{
                                             minWidth: { xs: 'auto', sm: 120 },
                                             px: { xs: 1.5, sm: 2 },
                                        }}
                                   >
                                        {t('tenants.socialProfileMessages')}
                                   </Button>
                              </Stack>
                         </Stack>
                    </div>
                    {/* <Typography variant="h6" color="text.primary">
                         {t('tenants.socialProfileTimeline')}
                    </Typography> */}
               </Box>
               <Divider />
               <Box sx={{ mt: 3 }}>
                    <SocialTimeline
                         posts={posts}
                         profile={profile}
                         buildingId={buildingId}
                    />
               </Box>
               <Dialog
                    fullWidth
                    maxWidth="md"
                    onClose={handleCloseCoverDialog}
                    open={isCoverDialogOpen}
               >
                    <DialogTitle>{t('tenants.socialProfileSelectCover', 'Select cover image')}</DialogTitle>
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
               <Dialog
                    fullWidth
                    maxWidth="sm"
                    onClose={handleCloseAvatarDialog}
                    open={isAvatarDialogOpen}
               >
                    <DialogTitle>{t('tenants.socialProfileSelectAvatar', 'Select avatar')}</DialogTitle>
                    <DialogContent dividers>
                         <Grid
                              container
                              spacing={2}
                         >
                              {AVATAR_IMAGES.map(imageUrl => (
                                   <Grid
                                        size={{
                                             md: 3,
                                             sm: 4,
                                             xs: 6
                                        }}
                                        key={imageUrl}
                                   >
                                        <Card
                                             sx={{
                                                  borderColor: selectedAvatar === imageUrl ? 'primary.main' : 'divider',
                                                  borderWidth: 2,
                                                  borderStyle: 'solid',
                                             }}
                                        >
                                             <CardActionArea
                                                  disabled={isUpdatingAvatar}
                                                  onClick={() => handleAvatarSelect(imageUrl)}
                                             >
                                                  <Stack
                                                       alignItems="center"
                                                       justifyContent="center"
                                                       sx={{ py: 3 }}
                                                  >
                                                       <Avatar
                                                            src={imageUrl}
                                                            sx={{ height: 72, width: 72 }}
                                                       />
                                                  </Stack>
                                             </CardActionArea>
                                        </Card>
                                   </Grid>
                              ))}
                         </Grid>
                    </DialogContent>
                    <DialogActions>
                         <Button
                              disabled={isUpdatingAvatar}
                              onClick={handleCloseAvatarDialog}
                         >
                              {t('common.cancel', 'Cancel')}
                         </Button>
                    </DialogActions>
               </Dialog>
               <Dialog
                    fullWidth
                    maxWidth="sm"
                    onClose={handleCloseProfileDialog}
                    open={isProfileDialogOpen}
               >
                    <DialogTitle>{t('tenants.socialProfileModifyDataTitle', 'Modify profile data')}</DialogTitle>
                    <DialogContent dividers>
                         <Stack spacing={2}>
                              <TextField
                                   fullWidth
                                   label={t('tenants.socialProfileQuote', 'Quote')}
                                   multiline
                                   minRows={2}
                                   value={profileFormValues.quote || ''}
                                   onChange={handleProfileFieldChange('quote')}
                                   disabled={isUpdatingProfileData}
                              />
                              <TextField
                                   fullWidth
                                   label={t('tenants.socialProfileBio', 'Bio')}
                                   multiline
                                   minRows={2}
                                   value={profileFormValues.bio || ''}
                                   onChange={handleProfileFieldChange('bio')}
                                   disabled={isUpdatingProfileData}
                              />
                              {/* <TextField
                                   fullWidth
                                   label={t('tenants.socialProfilePhoneNumber', 'Phone number')}
                                   value={profileFormValues.phone_number || ''}
                                   onChange={handleProfileFieldChange('phone_number')}
                              /> */}

                              <LocalizationProvider dateAdapter={AdapterDayjs}>
                                   <DatePicker
                                        label={t('tenants.birthDate')}
                                        value={profileFormValues.date_of_birth ? dayjs(profileFormValues.date_of_birth) : null}
                                        onChange={(date) => {
                                             setProfileFormValues(prev => ({
                                                  ...prev,
                                                  date_of_birth: date ? date.format('YYYY-MM-DD') : undefined,
                                             }));
                                        }}
                                        slotProps={{
                                             textField: {
                                                  fullWidth: true,
                                                  name: 'date_of_birth',
                                             },
                                        }}
                                        disabled={isUpdatingProfileData}
                                        disableFuture={true}
                                   />
                              </LocalizationProvider>

                              <TextField
                                   fullWidth
                                   label={t('tenants.socialProfileCurrentCity', 'Current city')}
                                   value={profileFormValues.current_city || ''}
                                   onChange={handleProfileFieldChange('current_city')}
                                   disabled={isUpdatingProfileData}
                              />
                              <TextField
                                   fullWidth
                                   label={t('tenants.socialProfileOriginCity', 'Origin city')}
                                   value={profileFormValues.origin_city || ''}
                                   onChange={handleProfileFieldChange('origin_city')}
                                   disabled={isUpdatingProfileData}
                              />
                              <TextField
                                   fullWidth
                                   label={t('tenants.socialProfileCurrentJobTitle', 'Current job title')}
                                   value={profileFormValues.current_job_title || ''}
                                   onChange={handleProfileFieldChange('current_job_title')}
                                   disabled={isUpdatingProfileData}
                              />
                              <TextField
                                   fullWidth
                                   label={t('tenants.socialProfileCurrentJobCompany', 'Current job company')}
                                   value={profileFormValues.current_job_company || ''}
                                   onChange={handleProfileFieldChange('current_job_company')}
                                   disabled={isUpdatingProfileData}
                              />
                              <TextField
                                   fullWidth
                                   label={t('tenants.socialProfilePreviousJobTitle', 'Previous job title')}
                                   value={profileFormValues.previous_job_title || ''}
                                   onChange={handleProfileFieldChange('previous_job_title')}
                                   disabled={isUpdatingProfileData}
                              />
                              <TextField
                                   fullWidth
                                   label={t('tenants.socialProfilePreviousJobCompany', 'Previous job company')}
                                   value={profileFormValues.previous_job_company || ''}
                                   onChange={handleProfileFieldChange('previous_job_company')}
                                   disabled={isUpdatingProfileData}
                              />

                         </Stack>
                    </DialogContent>
                    <DialogActions>
                         <Button
                              disabled={isUpdatingProfileData}
                              onClick={handleCloseProfileDialog}
                         >
                              {t('common.cancel', 'Cancel')}
                         </Button>
                         <Button
                              disabled={isUpdatingProfileData}
                              onClick={handleProfileDataSave}
                              variant="contained"
                         >
                              {t('common.save', 'Save')}
                         </Button>
                    </DialogActions>
               </Dialog>
          </>
     );
};
