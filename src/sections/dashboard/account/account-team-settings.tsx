'use client'

import type { FC } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import PropTypes from 'prop-types';
import DotsHorizontalIcon from '@untitled-ui/icons-react/build/esm/DotsHorizontal';
import Mail01Icon from '@untitled-ui/icons-react/build/esm/Mail01';
import User01Icon from '@untitled-ui/icons-react/build/esm/User01';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { Box, Grid } from '@mui/material';;
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { Scrollbar } from 'src/components/scrollbar';
import { Client, ClientMember, clientMemberValidationSchema } from 'src/types/client';
import { Formik } from 'formik';
import { inviteClientMemberByResettingPassword } from 'src/app/actions/client/client-members';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

interface AccountTeamSettingsProps {
  members: ClientMember[];
  client: Client
}

export const AccountTeamSettings: FC<AccountTeamSettingsProps> = (props) => {

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { members, client } = props;
  console.log('client:', client);

  const { t } = useTranslation();

  return (
    <Card>
      <CardContent>
        <Formik
          initialValues={{ name: '', email: '' }}
          validationSchema={clientMemberValidationSchema(t)}
          onSubmit={async (values, { setSubmitting, resetForm }) => {
            setSubmitting(true);
            const { inviteClientMemberSuccess } = await inviteClientMemberByResettingPassword(values.email!, client!.id!);
            if (inviteClientMemberSuccess) {
              toast.success('Invitation sent successfully!');
              setSubmitting(false);
              resetForm();
            } else {
              toast.error('Failed to send invitation.');
              setSubmitting(false);
            }
          }}
        >
          {({ handleChange, values, errors, touched, isSubmitting, handleSubmit }) => (
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                    <Typography variant="h6">Invite members</Typography>
                    <Typography color="text.secondary" variant="body2">
                      You currently pay for 2 Editor Seats.
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
                      label="Name"
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
                      label="Email address"
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
                      type="email"
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
                      sx={{ mb: 4, width: isMobile ? '100%' : '250px' }}
                    >
                      Send Invite
                    </Button>
                  </Box>

                </Grid>
              </Grid>
            </form>
          )}
        </Formik>
      </CardContent>
      <Scrollbar>
        <Table sx={{ minWidth: 400 }}>
          <TableHead>
            <TableRow>
              <TableCell>Member</TableCell>
              <TableCell>Email</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((member, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Stack
                    alignItems="center"
                    direction="row"
                    spacing={1}
                  >
                    {/* <Avatar
                      src={member.avatar}
                      sx={{
                        height: 40,
                        width: 40,
                      }}
                    >
                      <SvgIcon>
                        <User01Icon />
                      </SvgIcon>
                    </Avatar> */}
                    <div>
                      <Typography variant="subtitle2">{member.name}</Typography>
                      <Typography
                        color="text.secondary"
                        variant="body2"
                      >
                        {member.email}
                      </Typography>
                    </div>
                  </Stack>
                </TableCell>
                {/* <TableCell>
                  {member.role === 'Owner' ? (
                    <SeverityPill>{member.role}</SeverityPill>
                  ) : (
                    member.role
                  )}
                </TableCell> */}
                <TableCell align="right">
                  <IconButton>
                    <SvgIcon>
                      <DotsHorizontalIcon />
                    </SvgIcon>
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Scrollbar>
    </Card>
  );
};

AccountTeamSettings.propTypes = {
  members: PropTypes.array.isRequired,
};
