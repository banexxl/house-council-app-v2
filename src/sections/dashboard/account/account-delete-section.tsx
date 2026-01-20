import type { FC } from 'react';
import { useState } from 'react';
import { deleteCustomerByIDsAction } from 'src/app/actions/customer/customer-actions';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { logout } from 'src/app/auth/actions';
import { useTranslation } from 'react-i18next';

export const DeleteAccountSection: FC<{ id?: string }> = ({ id }) => {
     const [showConfirm, setShowConfirm] = useState(false);
     const [confirmText, setConfirmText] = useState('');
     const [deleting, setDeleting] = useState(false);
     const [error, setError] = useState('');
     const [success, setSuccess] = useState(false);

     const { t } = useTranslation();

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
               setError(t('account.deleteAccountError'));
               return;
          }
          setDeleting(true);
          setError('');
          const result = await deleteCustomerByIDsAction([id ?? '']);
          setDeleting(false);
          if (result.deleteCustomerByIDsActionSuccess) {
               logout();
               setSuccess(true);
          } else {
               setError(result.deleteCustomerByIDsActionError || t('account.deleteAccountError'));
          }
     };

     return (
          <Stack alignItems="flex-start" spacing={3}>
               <Typography variant="subtitle1">
                    {t('account.deleteAccount')}
               </Typography>
               <Button color="error" variant="outlined" onClick={handleDeleteClick} disabled={deleting || success}>
                    {t('common.btnDelete')}
               </Button>
               {showConfirm && !success && (
                    <Stack spacing={2} sx={{ mt: 2, width: '350px' }}>
                         <Typography color="error">
                              {t('account.deleteAccountConfirmInstruction')}
                         </Typography>
                         <TextField
                              label={t('account.deleteAccountConfirmLabel')}
                              value={confirmText}
                              onChange={handleConfirmChange}
                              fullWidth
                              disabled={deleting}
                         />
                         <Button color="error" variant="contained" onClick={handleDeleteAccount} disabled={deleting || confirmText !== 'delete account'}>
                              {t('account.deleteAccountConfirmButton')}
                         </Button>
                         {error && <Typography color="error">{error}</Typography>}
                    </Stack>
               )}
               {success && (
                    <Typography color="success.main">{t('account.deleteAccountSuccess')}</Typography>
               )}
          </Stack>
     );
};
