import React, { ReactNode } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';

interface PopupModalProps {
     isOpen: boolean;
     onClose: () => void;
     onConfirm: () => void;
     title: string;
     children?: ReactNode;
     confirmText?: string;
     cancelText?: string;
}

export function PopupModal({
     isOpen,
     onClose,
     onConfirm,
     title,
     children,
     confirmText = 'OK',
     cancelText = 'Cancel'
}: PopupModalProps) {

     return (
          <Dialog
               open={isOpen}
               onClose={onClose}
               aria-labelledby="popup-dialog-title"
          >
               <DialogTitle id="popup-dialog-title">{title}</DialogTitle>
               <DialogContent>
                    <DialogContentText component="div">
                         {children}
                    </DialogContentText>
               </DialogContent>
               <DialogActions>
                    <Button onClick={onClose} color="primary">
                         {cancelText}
                    </Button>
                    <Button onClick={onConfirm} color="primary" variant="contained">
                         {confirmText}
                    </Button>
               </DialogActions>
          </Dialog>
     );
}
