'use client';

import { useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export const ApprovalResultClient = () => {
     const params = useSearchParams();
     const status = params.get('status') || 'error';
     const email = params.get('email') || '';
     const code = params.get('code') || '';
     const message = params.get('message') || '';

     const isSuccess = status === 'success';
     const isRejected = status === 'rejected';
     const isError = !isSuccess && !isRejected;

     const summaries: Record<
          'success' | 'rejected' | 'user_exists' | 'generic_error',
          { title: string; description: string; Icon: typeof CheckCircleOutlineIcon; color: string }
     > = {
          success: {
               title: 'Request approved',
               description: `A tenant account${email ? ` for ${email}` : ''} has been created. If needed, share the default access-request password or send them a reset link.`,
               Icon: CheckCircleOutlineIcon,
               color: 'success.main',
          },
          rejected: {
               title: 'Request rejected',
               description: `The request${email ? ` for ${email}` : ''} was rejected. No user account was created.`,
               Icon: InfoOutlinedIcon,
               color: 'info.main',
          },
          user_exists: {
               title: 'Account already exists',
               description: `A Supabase user already exists${email ? ` for ${email}` : ''}. No new account was created. You can reset their password or assign the existing user to the building manually.`,
               Icon: InfoOutlinedIcon,
               color: 'warning.main',
          },
          generic_error: {
               title: 'We hit a snag',
               description: message || 'We could not complete this approval. Please try again or provision the user manually.',
               Icon: ErrorOutlineIcon,
               color: 'error.main',
          },
     };

     const summary =
          isSuccess
               ? summaries.success
               : isRejected
                    ? summaries.rejected
                    : code === 'user_exists'
                         ? summaries.user_exists
                         : summaries.generic_error;

     const IconComponent = summary.Icon;

     return (
          <Box
               component="main"
               sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '70vh',
                    py: { xs: 6, md: 10 },
               }}
          >
               <Container maxWidth="sm">
                    <Card
                         elevation={6}
                         sx={{
                              borderRadius: 2,
                              overflow: 'hidden',
                         }}
                    >
                         <CardContent>
                              <Stack spacing={3} alignItems="center" textAlign="center">
                                   <Box
                                        sx={{
                                             display: 'inline-flex',
                                             p: 1.5,
                                             borderRadius: '50%',
                                             bgcolor: 'action.hover',
                                             color: summary.color,
                                        }}
                                   >
                                        <IconComponent fontSize="large" />
                                   </Box>
                                   <Stack spacing={1}>
                                        <Typography variant="h5">{summary.title}</Typography>
                                        <Typography color="text.secondary">{summary.description}</Typography>
                                   </Stack>
                                   {isError && message && code !== 'user_exists' && (
                                        <Alert severity="warning" sx={{ width: '100%' }}>
                                             {message}
                                        </Alert>
                                   )}
                                   <Stack
                                        direction={{ xs: 'column', sm: 'row' }}
                                        spacing={2}
                                        justifyContent="center"
                                        sx={{ width: '100%' }}
                                   >
                                        <Button
                                             variant="contained"
                                             href="/auth/login"
                                             sx={{ width: { xs: '100%', sm: 'auto' } }}
                                        >
                                             Back to login
                                        </Button>
                                   </Stack>
                              </Stack>
                         </CardContent>
                    </Card>
               </Container>
          </Box>
     );
};
