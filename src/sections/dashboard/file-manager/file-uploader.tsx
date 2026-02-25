import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import type { FileRejection } from 'react-dropzone';
import XIcon from '@untitled-ui/icons-react/build/esm/X';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';

import { File, FileDropzone } from 'src/components/file-dropzone';

const ACCEPT_IMAGES_AND_DOCS = {
  'image/*': [],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/vnd.oasis.opendocument.text': ['.odt'],
  'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
} as const;

interface FileUploaderProps {
  onClose?: () => void;
  onUpload?: (files: File[]) => Promise<void> | void;
  open?: boolean;
}

export const FileUploader: FC<FileUploaderProps> = (props) => {
  const { onClose, onUpload, open = false } = props;
  const [files, setFiles] = useState<File[]>([]);
  const [invalidFileTypeError, setInvalidFileTypeError] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined);
  const { t } = useTranslation();

  useEffect(() => {
    setFiles([]);
    setInvalidFileTypeError(false);
    setUploadProgress(undefined);
  }, [open]);

  const handleClose = useCallback((): void => {
    if (uploadProgress !== undefined) return;
    onClose?.();
  }, [onClose, uploadProgress]);

  const handleDrop = useCallback((newFiles: File[]): void => {
    setInvalidFileTypeError(false);
    setFiles((prevFiles) => {
      const byName = new Map<string, File>();

      for (const file of prevFiles) {
        byName.set(file.name.toLowerCase(), file);
      }

      for (const file of newFiles) {
        const key = file.name.toLowerCase();
        if (!byName.has(key)) {
          byName.set(key, file);
        }
      }

      return Array.from(byName.values());
    });
  }, []);

  const handleDropRejected = useCallback((_fileRejections: FileRejection[]): void => {
    setInvalidFileTypeError(true);
  }, []);

  const handleRemove = useCallback((file: File): void => {
    setFiles((prevFiles) => {
      return prevFiles.filter((_file) => _file !== file);
    });
  }, []);

  const handleRemoveAll = useCallback((): void => {
    setFiles([]);
  }, []);

  const handleUpload = useCallback(async (): Promise<void> => {
    if (!onUpload || !files.length) {
      handleClose();
      return;
    }

    let fakeProgress = 0;
    setUploadProgress(0);

    const interval = window.setInterval(() => {
      fakeProgress += 5;
      if (fakeProgress <= 99) {
        setUploadProgress(fakeProgress);
      }
    }, 300);

    try {
      await onUpload(files);
      window.clearInterval(interval);
      setUploadProgress(100);

      setTimeout(() => {
        setUploadProgress(undefined);
      }, 700);

      handleClose();
    } catch (error) {
      window.clearInterval(interval);
      setUploadProgress(undefined);
      // Keep dialog open so the user can retry
      // (errors are handled by the caller in most cases)
    }
  }, [files, handleClose, onUpload]);

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      onClose={handleClose}
    >
      <Stack
        alignItems="center"
        direction="row"
        justifyContent="space-between"
        spacing={3}
        sx={{
          px: 3,
          py: 2,
        }}
      >
        <Typography variant="h6">{t(tokens.fileManager.uploadDialogTitle)}</Typography>
        <IconButton
          color="inherit"
          onClick={handleClose}
          disabled={uploadProgress !== undefined}
        >
          <SvgIcon>
            <XIcon />
          </SvgIcon>
        </IconButton>
      </Stack>
      <DialogContent>
        <Stack spacing={2}>
          {invalidFileTypeError && (
            <Alert
              severity="error"
              onClose={() => setInvalidFileTypeError(false)}
            >
              {t(tokens.fileManager.invalidFileType)}
            </Alert>
          )}
          <FileDropzone
            accept={ACCEPT_IMAGES_AND_DOCS}
            caption={t(tokens.fileManager.maxFileSize)}
            files={files}
            onDrop={handleDrop}
            onDropRejected={handleDropRejected}
            onRemoveFile={handleRemove}
            onRemoveImage={() => undefined}
            onRemoveAll={handleRemoveAll}
            onUpload={handleUpload}
            uploadProgress={uploadProgress}
            uploadMessage="Uploading files..."
          />
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

FileUploader.propTypes = {
  onClose: PropTypes.func,
  onUpload: PropTypes.func,
  open: PropTypes.bool,
};
