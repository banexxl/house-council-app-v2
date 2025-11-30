'use client';

import { useState, useTransition } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { changePassword } from 'src/app/actions/auth/change-password';

const ChangePasswordForm = () => {
     const [currentPassword, setCurrentPassword] = useState('');
     const [newPassword, setNewPassword] = useState('');
     const [confirmPassword, setConfirmPassword] = useState('');
     const [status, setStatus] = useState<{ success?: boolean; error?: string }>({});
     const [isPending, startTransition] = useTransition();

     const handleSubmit = () => {
          setStatus({});

          if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
               setStatus({ error: 'Please fill in all fields' });
               return;
          }

          if (newPassword !== confirmPassword) {
               setStatus({ error: 'New passwords do not match' });
               return;
          }

          startTransition(async () => {
               const result = await changePassword({
                    currentPassword,
                    newPassword,
               });

               if (result.success) {
                    setStatus({ success: true });
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
               } else {
                    setStatus({ error: result.error || 'Failed to change password' });
               }
          });
     };

     const disabled = isPending;

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
               <Card
                    sx={{
                         width: '100%',
                         maxWidth: 420,
                         boxShadow: 6,
                         borderRadius: 2,
                    }}
               >
                    <CardContent>
                         <Stack spacing={2}>
                              <Typography variant="h5">Change Password</Typography>
                              <Typography variant="body2" color="text.secondary">
                                   Enter your current password and choose a new one.
                              </Typography>
                              {status.error && <Alert severity="error">{status.error}</Alert>}
                              {status.success && <Alert severity="success">Password updated successfully.</Alert>}
                              <TextField
                                   type="password"
                                   label="Current password"
                                   value={currentPassword}
                                   onChange={(e) => setCurrentPassword(e.target.value)}
                                   disabled={disabled}
                                   fullWidth
                              />
                              <TextField
                                   type="password"
                                   label="New password"
                                   value={newPassword}
                                   onChange={(e) => setNewPassword(e.target.value)}
                                   disabled={disabled}
                                   fullWidth
                              />
                              <TextField
                                   type="password"
                                   label="Confirm new password"
                                   value={confirmPassword}
                                   onChange={(e) => setConfirmPassword(e.target.value)}
                                   disabled={disabled}
                                   fullWidth
                              />
                              <Button variant="contained" onClick={handleSubmit} disabled={disabled}>
                                   {isPending ? 'Updating...' : 'Update password'}
                              </Button>
                              <Button variant="text" href="/dashboard">
                                   Back to dashboard
                              </Button>
                         </Stack>
                    </CardContent>
               </Card>
          </Box>
     );
};

export default ChangePasswordForm;
