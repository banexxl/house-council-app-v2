import React, { ReactNode, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { SxProps, Theme } from '@mui/material/styles';

type ModalType = 'confirmation' | 'success' | 'error';

interface PopupModalProps {
     isOpen: boolean;
     onClose: () => void;
     onConfirm?: () => void;
     title: string;
     children?: ReactNode;
     confirmText?: string;
     cancelText?: string;
     type: ModalType;
     loading?: boolean;
}

const iconStyle: SxProps<Theme> = {
     fontSize: 64,
     mb: 2,
};

const getIcon = (type: ModalType) => {
     switch (type) {
          case 'confirmation':
               return <HelpOutlineIcon sx={{ ...iconStyle, color: 'primary.main' }} />;
          case 'success':
               return <CheckCircleIcon sx={{ ...iconStyle, color: 'primary.success' }} />;
          case 'error':
               return <ErrorIcon sx={{ ...iconStyle, color: 'primary.error' }} />;
     }
};

export function PopupModal({
     isOpen,
     onClose,
     onConfirm,
     title,
     children,
     confirmText = 'OK',
     cancelText = 'Cancel',
     type,
}: PopupModalProps) {

     const [loading, setLoading] = useState(false);

     return (
          <Dialog
               id='popup-dialog'
               open={isOpen}
               onClose={onClose}
               aria-labelledby="popup-dialog-title"
          >
               <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                    {getIcon(type)}
                    <DialogTitle id="popup-dialog-title">
                         <Typography variant="h6" component="div" align="center">
                              {title}
                         </Typography>
                    </DialogTitle>
                    <DialogContent>
                         <DialogContentText component="div">
                              {children}
                         </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                         {type === 'confirmation' && (
                              <Button onClick={onClose} color="primary">
                                   {cancelText}
                              </Button>
                         )}
                         <Button
                              onClick={async () => {
                                   if (type === 'confirmation' && onConfirm) {
                                        setLoading(true);
                                        await onConfirm();
                                        setLoading(false);
                                   } else {
                                        onClose();
                                   }
                              }}
                              color="primary"
                              variant="contained"
                              loading={loading}
                         >
                              {type === 'confirmation' ? confirmText : 'Close'}
                         </Button>
                    </DialogActions>
               </Box>
          </Dialog>
     );
}
