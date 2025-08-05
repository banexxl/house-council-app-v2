import type { FC } from 'react';
import { useState } from 'react';
import { deleteClientByIDsAction } from 'src/app/actions/client/client-actions';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { logout } from 'src/app/auth/actions';

export const DeleteAccountSection: FC<{ id?: string }> = ({ id }) => {
     const [showConfirm, setShowConfirm] = useState(false);
     const [confirmText, setConfirmText] = useState('');
     const [deleting, setDeleting] = useState(false);
     const [error, setError] = useState('');
     const [success, setSuccess] = useState(false);

     const handleDeleteClick = () => {
          setShowConfirm(true);
          setError('');
          setSuccess(false);
     };

     const handleConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          setConfirmText(e.target.value);
     };

     const handleDeleteAccount = async () => {
          if (confirmText !== 'delete account') {
               setError('You must type "delete account" to confirm.');
               return;
          }
          setDeleting(true);
          setError('');
          const result = await deleteClientByIDsAction([id ?? '']);
          setDeleting(false);
          if (result.deleteClientByIDsActionSuccess) {
               logout();
               setSuccess(true);
          } else {
               setError(result.deleteClientByIDsActionError || 'Failed to delete account.');
          }
     };

     return (
          <Stack alignItems="flex-start" spacing={3}>
               <Typography variant="subtitle1">
                    Delete your account and all of your source data. This is irreversible.
               </Typography>
               <Button color="error" variant="outlined" onClick={handleDeleteClick} disabled={deleting || success}>
                    Delete account
               </Button>
               {showConfirm && !success && (
                    <Stack spacing={2} sx={{ mt: 2, width: '350px' }}>
                         <Typography color="error">
                              Type <b>delete account</b> below to confirm deletion.
                         </Typography>
                         <TextField
                              label="Confirm deletion"
                              value={confirmText}
                              onChange={handleConfirmChange}
                              fullWidth
                              disabled={deleting}
                         />
                         <Button color="error" variant="contained" onClick={handleDeleteAccount} disabled={deleting || confirmText !== 'delete account'}>
                              Confirm Delete
                         </Button>
                         {error && <Typography color="error">{error}</Typography>}
                    </Stack>
               )}
               {success && (
                    <Typography color="success.main">Account deleted successfully.</Typography>
               )}
          </Stack>
     );
};
