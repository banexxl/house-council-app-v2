import { useState, type FC } from 'react';
import PropTypes from 'prop-types';
import type { DropzoneOptions, FileWithPath } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';
import Upload01Icon from '@untitled-ui/icons-react/build/esm/Upload01';
import XIcon from '@untitled-ui/icons-react/build/esm/X';
import CloseIcon from '@mui/icons-material/Close';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { FullScreenLoader } from './full-screen-loader';
import { Card, CardContent, Dialog, Fade, Grid, ListItemAvatar, Tooltip } from '@mui/material';
import { PopupModal } from './modal-dialog';
import { setAsBuildingCoverImage } from 'src/libs/supabase/sb-storage';
import toast from 'react-hot-toast';

export type File = FileWithPath;

interface FileDropzoneProps extends DropzoneOptions {
  entityId?: string
  caption?: string;
  files?: File[];
  onRemoveImage?: (url: string) => void;
  onRemoveAll?: () => void;
  onUpload?: () => void;
  uploadProgress?: number;
  images?: string[]
}

export const FileDropzone: FC<FileDropzoneProps> = (props) => {
  console.log(props);

  const { entityId, caption, onRemoveAll, onUpload, uploadProgress, images, onRemoveImage, ...other } = props;
  const { getRootProps, getInputProps, isDragActive } = useDropzone(other);
  const { t } = useTranslation()
  const [open, setOpen] = useState<string | null>('');
  const [openRemoveAll, setOpenRemoveAll] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredImageIndex, setHoveredImageIndex] = useState<number | null>(null);

  const handleImageClick = (index: number) => {
    setSelectedIndex(index);
    setViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setSelectedIndex(null);
  };

  const handleSetAsCover = async (url: string) => {
    try {
      const { success } = await setAsBuildingCoverImage(entityId!, url)
      if (success) {
        toast.success(t('common.actionSaveSuccess'));
      } else {
        toast.error(t('common.actionSaveError'));
      }
    } catch (error) {
      toast.error(t('common.actionSaveError'));
    }
  };

  return (
    <div>
      {uploadProgress !== undefined && (
        <FullScreenLoader progress={uploadProgress} message="Uploading image..." />
      )}
      <Box
        sx={{
          alignItems: 'center',
          border: 1,
          borderRadius: '20px',
          borderStyle: 'dashed',
          borderColor: 'divider',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          outline: 'none',
          p: 6,
          ...(isDragActive && {
            backgroundColor: 'action.active',
            opacity: 0.5,
          }),
          '&:hover': {
            backgroundColor: 'action.hover',
            cursor: 'pointer',
            opacity: 0.5,
          },
        }}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        <Stack
          alignItems="center"
          direction="row"
          spacing={2}
        >
          <Avatar
            sx={{
              height: 64,
              width: 64,
            }}
          >
            <SvgIcon>
              <Upload01Icon />
            </SvgIcon>
          </Avatar>
          <Stack spacing={1}>
            <Typography
              sx={{
                '& span': {
                  textDecoration: 'underline',
                },
              }}
              variant="h6"
            >
              <span>{t('common.actionClickToUploadOrDragAndDrop')}</span>
            </Typography>
            {caption && (
              <Typography
                color="text.secondary"
                variant="body2"
              >
                {caption}
              </Typography>
            )}
          </Stack>
        </Stack>
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t('common.lblUploadedImages') ?? 'Uploaded Images'}
        </Typography>
        {images && images.length > 0 && (
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Grid container spacing={2}>
                {images.map((url, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                    <Box
                      sx={{
                        position: 'relative',
                        width: '80%',
                        paddingTop: '100%',
                        borderRadius: 1,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                        }}
                        onMouseEnter={() => setHoveredImageIndex(index)}
                        onMouseLeave={() => setHoveredImageIndex(null)}
                      >
                        <Tooltip title={url.split('/').pop()} placement="top">
                          <img
                            src={url}
                            alt={`Uploaded ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        </Tooltip>

                        <Fade in={hoveredImageIndex === index}>
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 8,
                              left: '50%',
                              transform: 'translateX(-50%)',
                            }}
                          >
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              sx={{
                                textTransform: 'none',
                                fontWeight: 500,
                                fontSize: '0.75rem',
                                px: 2,
                                py: 0.5,
                              }}
                              onClick={() => handleSetAsCover(images[index])}
                            >
                              Set as cover
                            </Button>
                          </Box>
                        </Fade>
                      </Box>

                      {/* Remove button (independent of hover) */}
                      <IconButton
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'background.paper',
                          '&:hover': { bgcolor: 'grey.100' },
                        }}
                        onClick={() => setOpen(url)}
                      >
                        <Tooltip title={t('common.actionRemove')}>
                          <SvgIcon fontSize="small">
                            <XIcon />
                          </SvgIcon>
                        </Tooltip>
                      </IconButton>

                      <PopupModal
                        isOpen={Boolean(open)}
                        onClose={() => setOpen(null)}
                        onConfirm={() => {
                          onRemoveImage!(open!);
                          setOpen(null);
                        }}
                        title={'Are you sure you want to remove this image?'}
                        type={'confirmation'}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Box sx={{ textAlign: 'right', mt: 2 }}>
                <Button size="small" color="error" onClick={() => setOpenRemoveAll(true)}>
                  Remove all
                </Button>
                <PopupModal
                  isOpen={openRemoveAll}
                  onClose={() => setOpenRemoveAll(false)}
                  onConfirm={() => {
                    onRemoveAll!();
                    setOpenRemoveAll(false);
                  }}
                  title={'Are you sure you want to remove all images?'}
                  type={'confirmation'}
                />
              </Box>

            </CardContent>
          </Card>
        )}
        <Dialog
          open={viewerOpen}
          onClose={handleCloseViewer}
          fullWidth
          maxWidth="md"
          slotProps={{
            paper: {
              sx: {
                bgcolor: 'background.default',
                boxShadow: 5,
              },
            },
          }}
        >
          <Box sx={{ position: 'relative', p: 2 }}>
            <IconButton
              onClick={handleCloseViewer}
              sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
            >
              <CloseIcon />
            </IconButton>
            {selectedIndex !== null && (
              <img
                src={images?.[selectedIndex]}
                alt={`Preview ${selectedIndex + 1}`}
                style={{ width: '100%', height: 'auto', borderRadius: 8 }}
              />
            )}
            {/* Optional: Add next/prev buttons */}
          </Box>
        </Dialog>

      </Box>
    </div>
  );
};

FileDropzone.propTypes = {
  caption: PropTypes.string,
  onRemoveImage: PropTypes.func,
  onRemoveAll: PropTypes.func,
  onUpload: PropTypes.func,
  // From Dropzone
  accept: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string.isRequired).isRequired),
  disabled: PropTypes.bool,
  getFilesFromEvent: PropTypes.func,
  maxFiles: PropTypes.number,
  maxSize: PropTypes.number,
  minSize: PropTypes.number,
  noClick: PropTypes.bool,
  noDrag: PropTypes.bool,
  noDragEventsBubbling: PropTypes.bool,
  noKeyboard: PropTypes.bool,
  onDrop: PropTypes.func,
  onDropAccepted: PropTypes.func,
  onDropRejected: PropTypes.func,
  onFileDialogCancel: PropTypes.func,
  preventDropOnDocument: PropTypes.bool,
};
