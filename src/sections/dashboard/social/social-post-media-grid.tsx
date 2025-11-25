'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import CardActionArea from '@mui/material/CardActionArea';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@untitled-ui/icons-react/build/esm/ChevronLeft';
import ChevronRightIcon from '@untitled-ui/icons-react/build/esm/ChevronRight';
import { useTranslation } from 'react-i18next';

import { useSignedUrl } from 'src/hooks/use-signed-urls';
import type { TenantPostImage } from 'src/types/social';
import { tokens } from 'src/locales/tokens';

interface SocialPostMediaGridProps {
  media: TenantPostImage[];
}

const SIGN_OPTIONS = { ttlSeconds: 60 * 30, refreshSkewSeconds: 20 };

const ThumbnailImage = ({
  item,
  onClick,
  alt,
}: {
  item: TenantPostImage;
  onClick: () => void;
  alt: string;
}) => {
  const { url, loading } = useSignedUrl(item.storage_bucket, item.storage_path, SIGN_OPTIONS);

  return (
    <CardActionArea
      onClick={onClick}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        width: 140,
        height: 140,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          bgcolor: 'grey.100',
        }}
      >
        {url ? (
          <Box
            component="img"
            src={url}
            alt={alt}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <Skeleton
            variant="rectangular"
            animation={loading ? 'wave' : false}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
            }}
          />
        )}
      </Box>
    </CardActionArea>
  );
};

const ViewerImage = ({ item, alt, loadErrorText }: { item: TenantPostImage; alt: string; loadErrorText: string }) => {
  const { url, loading, error } = useSignedUrl(item.storage_bucket, item.storage_path, SIGN_OPTIONS);

  if (!url) {
    return (
      <Box
        sx={{
          alignItems: 'center',
          color: 'common.white',
          display: 'flex',
          justifyContent: 'center',
          minHeight: { xs: 280, md: 420 },
          width: '100%',
        }}
      >
        {loading ? (
          <CircularProgress color="inherit" size={32} />
        ) : (
          <Typography color="inherit" variant="body2">
            {error || loadErrorText}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={url}
      alt={alt}
      sx={{
        display: 'block',
        maxHeight: '70vh',
        width: '100%',
        objectFit: 'contain',
      }}
    />
  );
};

export const SocialPostMediaGrid = ({ media }: SocialPostMediaGridProps) => {
  const { t } = useTranslation();
  const validMedia = useMemo(
    () => media.filter((item) => item?.storage_bucket && item?.storage_path),
    [media]
  );
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const loadErrorText = t(tokens.tenants.socialMediaLoadError);
  const selectedAlt = t(tokens.tenants.socialMediaSelectedAlt);

  useEffect(() => {
    if (!validMedia.length) {
      setViewerOpen(false);
      setActiveIndex(0);
      return;
    }
    if (activeIndex > validMedia.length - 1) {
      setActiveIndex(validMedia.length - 1);
    }
  }, [activeIndex, validMedia.length]);

  const handleOpen = useCallback((index: number) => {
    setActiveIndex(index);
    setViewerOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setViewerOpen(false);
  }, []);

  const handlePrev = useCallback(() => {
    if (validMedia.length <= 1) return;
    setActiveIndex((prev) => (prev === 0 ? validMedia.length - 1 : prev - 1));
  }, [validMedia.length]);

  const handleNext = useCallback(() => {
    if (validMedia.length <= 1) return;
    setActiveIndex((prev) => (prev === validMedia.length - 1 ? 0 : prev + 1));
  }, [validMedia.length]);

  useEffect(() => {
    if (!viewerOpen || validMedia.length <= 1) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      } else if (event.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [viewerOpen, validMedia.length, handlePrev, handleNext, handleClose]);

  if (!validMedia.length) {
    return null;
  }

  const activeItem = validMedia[activeIndex];

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        }}
      >
        {validMedia.map((item, index) => (
          <ThumbnailImage
            key={item.id ?? `${item.storage_bucket}-${item.storage_path}-${index}`}
            item={item}
            alt={t(tokens.tenants.socialMediaThumbnailAlt, { index: index + 1 })}
            onClick={() => handleOpen(index)}
          />
        ))}
      </Box>
      <Dialog
        fullWidth
        maxWidth="lg"
        onClose={handleClose}
        open={viewerOpen}
      >
        <DialogContent
          sx={{
            bgcolor: 'common.black',
            position: 'relative',
            p: { xs: 2, sm: 3 },
          }}
        >
          <IconButton
            aria-label={t(tokens.tenants.socialMediaPreviewClose)}
            onClick={handleClose}
            sx={{
              color: 'common.white',
              position: 'absolute',
              right: 12,
              top: 12,
              zIndex: 2,
            }}
          >
            <CloseIcon />
          </IconButton>
          {validMedia.length > 1 && (
            <>
              <IconButton
                aria-label={t(tokens.tenants.socialMediaPreviewPrevious)}
                onClick={handlePrev}
                sx={{
                  color: 'common.white',
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(0,0,0,0.4)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
                }}
              >
                <SvgIcon fontSize="large">
                  <ChevronLeftIcon />
                </SvgIcon>
              </IconButton>
              <IconButton
                aria-label={t(tokens.tenants.socialMediaPreviewNext)}
                onClick={handleNext}
                sx={{
                  color: 'common.white',
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(0,0,0,0.4)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
                }}
              >
                <SvgIcon fontSize="large">
                  <ChevronRightIcon />
                </SvgIcon>
              </IconButton>
            </>
          )}
          <Stack
            spacing={2}
            sx={{
              alignItems: 'center',
              color: 'common.white',
            }}
          >
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              {activeItem ? <ViewerImage item={activeItem} alt={selectedAlt} loadErrorText={loadErrorText} /> : null}
            </Box>
            <Typography
              color="common.white"
              variant="caption"
            >
              {activeIndex + 1} / {validMedia.length}
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
};
