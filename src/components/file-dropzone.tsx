// src/components/file-dropzone.tsx
'use client';

import { useState, type FC } from 'react';
import type { DropzoneOptions, FileWithPath } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';
import Upload01Icon from '@untitled-ui/icons-react/build/esm/Upload01';
import XIcon from '@untitled-ui/icons-react/build/esm/X';
import CloseIcon from '@mui/icons-material/Close';
import {
  Avatar, Box, Button, Card, CardContent, Dialog,
  Fade, Grid, IconButton, Skeleton, Stack, SvgIcon, Tooltip, Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { PopupModal } from './modal-dialog';
import { FullScreenLoader } from './full-screen-loader';
import { useSignedUrl } from 'src/hooks/use-signed-urls';

export type File = FileWithPath;

export type DBStoredImage = {
  id: string;
  created_at: string;
  updated_at: string;
  storage_bucket: string;
  storage_path: string;
  is_cover_image: boolean;
};

interface FileDropzoneProps extends DropzoneOptions {
  entityId?: string;
  caption?: string;
  files?: File[];
  uploadProgress?: number;
  images?: DBStoredImage[];
  onRemoveImage?: (image: DBStoredImage) => void;
  onRemoveAll?: () => void;
  onUpload?: () => void;
  onSetAsCover?: (image: DBStoredImage) => Promise<void>;
}

const fileNameFromPath = (p: string) => decodeURIComponent(p.split('/').pop() ?? '');

function Thumb({ image, onClick }: { image: DBStoredImage; onClick?: () => void }) {
  const { url, loading } = useSignedUrl(image.storage_bucket, image.storage_path, { ttlSeconds: 60 * 30, refreshSkewSeconds: 20 });

  if (loading) {
    return <Skeleton variant="rectangular" animation="wave" sx={{ width: '100%', height: '100%', borderRadius: 1 }} />;
  }

  if (!url) {
    return <Skeleton variant="rectangular" animation="wave" sx={{ width: '100%', height: '100%', borderRadius: 1 }} />;
  }
  return (
    <img
      src={url}
      alt={fileNameFromPath(image.storage_path)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: onClick ? 'zoom-in' : 'default' }}
      onClick={onClick}
    />
  );
}

export const FileDropzone: FC<FileDropzoneProps> = (props) => {
  const { entityId, caption, onRemoveAll, onUpload, uploadProgress, images = [], onRemoveImage, onSetAsCover, ...other } = props;
  const { getRootProps, getInputProps, isDragActive } = useDropzone(other);
  const { t } = useTranslation();

  const [openConfirm, setOpenConfirm] = useState<DBStoredImage | null>(null);
  const [openRemoveAll, setOpenRemoveAll] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div>
      {uploadProgress !== undefined && (
        <FullScreenLoader progress={uploadProgress} message="Uploading image..." />
      )}

      {/* dropzone */}
      <Box
        sx={{
          alignItems: 'center', border: 1, borderRadius: '20px', borderStyle: 'dashed', borderColor: 'divider',
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', outline: 'none', p: 6,
          ...(isDragActive && { backgroundColor: 'action.active', opacity: 0.5 }),
          '&:hover': { backgroundColor: 'action.hover', cursor: 'pointer', opacity: 0.5 },
        }}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        <Stack alignItems="center" direction="row" spacing={2}>
          <Avatar sx={{ height: 64, width: 64 }}>
            <SvgIcon><Upload01Icon /></SvgIcon>
          </Avatar>
          <Stack spacing={1}>
            <Typography variant="h6" sx={{ '& span': { textDecoration: 'underline' } }}>
              <span>{t('common.actionClickToUploadOrDragAndDrop')}</span>
            </Typography>
            {caption && <Typography color="text.secondary" variant="body2">{caption}</Typography>}
          </Stack>
        </Stack>
      </Box>

      {/* gallery */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{t('common.lblUploadedImages')}</Typography>

        {images.length > 0 ? (
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Grid container spacing={2}>
                {images.map((image, idx) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={image.id}>
                    <Box sx={{ position: 'relative', width: '80%', paddingTop: '100%', borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                      <Box
                        sx={{ position: 'absolute', inset: 0 }}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        <Tooltip title={fileNameFromPath(image.storage_path)} placement="top">
                          <Box sx={{ width: '100%', height: '100%' }}>
                            <Thumb image={image} onClick={() => { setSelectedIndex(idx); setViewerOpen(true); }} />
                          </Box>
                        </Tooltip>

                        <Fade in={hoveredIndex === idx}>
                          <Box sx={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 1 }}>
                            {onSetAsCover && (
                              <Button
                                size="small"
                                variant="contained"
                                color={image.is_cover_image ? 'success' : 'primary'}
                                sx={{ textTransform: 'none', fontWeight: 500, fontSize: '0.75rem', px: 2, py: 0.5 }}
                                onClick={async () => {
                                  try {
                                    await onSetAsCover(image);
                                    toast.success(t('common.actionSaveSuccess'));
                                  } catch {
                                    toast.error(t('common.actionSaveError'));
                                  }
                                }}
                                disabled={image.is_cover_image}
                              >
                                {image.is_cover_image ? t('common.lblCover') : t('common.actionSetAsCover')}
                              </Button>
                            )}
                          </Box>
                        </Fade>
                      </Box>

                      {/* remove */}
                      {onRemoveImage && (
                        <IconButton
                          size="small"
                          sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper', '&:hover': { bgcolor: 'grey.100' } }}
                          onClick={() => setOpenConfirm(image)}
                        >
                          <Tooltip title={t('common.actionRemove')}>
                            <SvgIcon fontSize="small"><XIcon /></SvgIcon>
                          </Tooltip>
                        </IconButton>
                      )}

                      <PopupModal
                        isOpen={Boolean(openConfirm)}
                        onClose={() => setOpenConfirm(null)}
                        onConfirm={() => {
                          if (openConfirm && onRemoveImage) onRemoveImage(openConfirm);
                          setOpenConfirm(null);
                        }}
                        title={t('common.actionWarnRemoveImage')}
                        type="confirmation"
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Box sx={{ textAlign: 'right', mt: 2 }}>
                {onRemoveAll && (
                  <>
                    <Button size="small" color="error" onClick={() => setOpenRemoveAll(true)}>
                      {t('common.btnRemoveAll')}
                    </Button>
                    <PopupModal
                      isOpen={openRemoveAll}
                      onClose={() => setOpenRemoveAll(false)}
                      onConfirm={() => { onRemoveAll(); setOpenRemoveAll(false); }}
                      title={t('warning.deleteWarningTitle')}
                      children={t('warning.deleteWarningMessage')}
                      type="confirmation"
                    />
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {t('common.lblNoImagesUploaded')}
          </Typography>
        )}

        <Dialog open={viewerOpen} onClose={() => setViewerOpen(false)} fullWidth maxWidth="md">
          <Box sx={{ position: 'relative', p: 2 }}>
            <IconButton onClick={() => setViewerOpen(false)} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
              <CloseIcon />
            </IconButton>
            {selectedIndex !== null && images[selectedIndex] && (
              <Thumb image={images[selectedIndex]} />
            )}
          </Box>
        </Dialog>
      </Box>
    </div>
  );
};
