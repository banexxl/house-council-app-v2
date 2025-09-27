'use client'

import type { FC } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Mail01Icon from '@untitled-ui/icons-react/build/esm/Mail01';
import User01Icon from '@untitled-ui/icons-react/build/esm/User01';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { Box, Grid } from '@mui/material';;
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { Client, ClientMember, clientMemberValidationSchema } from 'src/types/client';
import { Formik } from 'formik';
import { addClientMember, deleteClientMember } from 'src/app/actions/client/client-members';
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';
import toast from 'react-hot-toast';
import { GenericTable } from 'src/components/generic-table';
import { sendPasswordRecoveryEmail } from 'src/app/actions/client/client-actions';
import { SubscriptionPlan } from 'src/types/subscription-plan';

interface AccountTeamSettingsProps {
  members: ClientMember[];
  client: Client;
  clientSubscriptionPlan: SubscriptionPlan | null;
}

export const AccountTeamSettings: FC<AccountTeamSettingsProps> = (props) => {

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { members, client, clientSubscriptionPlan } = props;

  const { t } = useTranslation();

  // Handler for deleting a member
  const handleDeleteMember = async (id: string) => {
    const { deleteClientMemberSuccess, deleteClientMemberError } = await deleteClientMember(id);
    if (deleteClientMemberSuccess) {
      toast.success(t('account.team.memberDeleted'));
    } else {
      toast.error(t('account.team.memberDeleteError'));
    }
  };

  // Handler for resetting a member's password
  const handleResetPassword = async (member: ClientMember) => {
    const { success, error } = await sendPasswordRecoveryEmail(member.email);
    if (success) {
      toast.success(t('account.team.passwordResetSent'));
    } else {
      toast.error(t('account.team.passwordResetError'));
    }
  };

  return (
    <Card>
      <CardContent>
        <Formik
          initialValues={{ name: '', email: '' }}
          validationSchema={clientMemberValidationSchema(t)}
          onSubmit={async (values, { setSubmitting, resetForm }) => {
            setSubmitting(true);
            const { inviteClientMemberSuccess } = await addClientMember(values.email!, values.name, client!.id!);
            if (inviteClientMemberSuccess) {
              toast.success(t(tokens.account.team.inviteSuccess));
              setSubmitting(false);
              resetForm();
            } else {
              toast.error(t(tokens.account.team.inviteError));
              setSubmitting(false);
            }
          }}
        >
          {({ handleChange, values, errors, touched, isSubmitting, handleSubmit }) => (
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                    <Typography variant="h6">{t('account.team.inviteMembers')}</Typography>
                    <Typography color="text.secondary" variant="body2">
                      {t('account.team.editorSeatsInfo', { max: clientSubscriptionPlan?.max_number_of_team_members ?? 0 })}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 8 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-end', // align to bottom edge
                      gap: 2,
                      flexDirection: isMobile ? 'column' : 'row',
                    }}
                  >
                    <TextField
                      label={t('common.fullName', 'Name')}
                      name="name"
                      fullWidth
                      value={values.name}
                      onChange={handleChange}
                      error={touched.name && Boolean(errors.name)}
                      helperText={
                        <Typography
                          variant="caption"
                          color="error"
                          sx={{ minHeight: 24, display: 'block' }}
                        >
                          {touched.name && errors.name ? errors.name : ''}
                        </Typography>
                      }
                      sx={{ flexGrow: 1 }}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <SvgIcon>
                                <User01Icon />
                              </SvgIcon>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    <TextField
                      label={t('common.lblEmail')}
                      name="email"
                      fullWidth
                      value={values.email}
                      onChange={handleChange}
                      error={touched.email && Boolean(errors.email)}
                      helperText={
                        <Typography
                          variant="caption"
                          color="error"
                          sx={{ minHeight: 24, display: 'block' }}
                        >
                          {touched.email && errors.email ? errors.email : ''}
                        </Typography>
                      }
                      sx={{ flexGrow: 1 }}
                      type={t('lblEmail')}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <SvgIcon>
                                <Mail01Icon />
                              </SvgIcon>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      disabled={isSubmitting}
                      sx={{ mb: 4, width: isMobile ? '100%' : '250px', height: '50px' }}
                    >
                      {t('account.team.sendInvite')}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          )}
        </Formik>
      </CardContent>
      <Box sx={{ mt: 2 }}>
        <GenericTable<ClientMember>
          items={members}
          columns={[
            {
              key: 'name',
              label: t('common.fullName'),
              render: (value) => (
                <Typography variant="subtitle2">{value as string}</Typography>
              ),
            },
            {
              key: 'email',
              label: t('common.lblEmail'),
              render: (value) => (
                <Typography color="text.secondary" variant="body2">{value as string}</Typography>
              ),
            },
          ]}
          rowActions={[
            (member) => (
              <Button
                color="error"
                variant="outlined"
                size="small"
                onClick={() => handleDeleteMember(member.id)}
                key="delete"
              >
                {t('common.btnDelete')}
              </Button>
            ),
            (member) => (
              <Button
                color="primary"
                variant="outlined"
                size="small"
                onClick={() => handleResetPassword(member)}
                key="reset"
              >
                {t('account.team.btnResetPassword')}
              </Button>
            ),
          ]}
          tableTitle={t('account.team.membersTableTitle')}
          tableSubtitle={t('account.team.membersTableSubtitle')}
        />
      </Box>
    </Card>
  );
}
