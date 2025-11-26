import { useEffect, useState, type FC } from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import Edit02Icon from '@untitled-ui/icons-react/build/esm/Edit02';
import CheckIcon from '@untitled-ui/icons-react/build/esm/CheckVerified01';
import CloseIcon from '@mui/icons-material/Close';
import toast from 'react-hot-toast';
import Star01Icon from '@untitled-ui/icons-react/build/esm/Star01';
import Trash02Icon from '@untitled-ui/icons-react/build/esm/Trash02';
import XIcon from '@untitled-ui/icons-react/build/esm/X';
import { backdropClasses } from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import { TextField } from '@mui/material';;
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';

import type { Item } from 'src/types/file-manager';
import { bytesToSize } from 'src/utils/bytes-to-size';

import { ItemIcon } from '../item-icon';
import { ItemTags } from './item-tags';
import { ItemShared } from './item-shared';

interface ItemDrawerProps {
  item?: Item;
  onClose?: () => void;
  onDelete?: (itemId: string) => void;
  onFavorite?: (itemId: string, value: boolean) => void;
  onTagsChange?: (itemId: string, value: string[]) => void;
  onRename?: (itemId: string, newName: string, type: 'file' | 'folder') => Promise<void> | void;
  renameLoading?: boolean;
  open?: boolean;
}

export const ItemDrawer: FC<ItemDrawerProps> = (props) => {
  const {
    item,
    onClose,
    onDelete,
    onFavorite,
    onTagsChange,
    onRename,
    renameLoading = false,
    open = false,
  } = props;
  const { t } = useTranslation();
  const [name, setName] = useState(item?.name || '');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setName(item?.name || '');
    setIsEditing(false);
  }, [item?.name]);

  let content: JSX.Element | null = null;

  if (item) {
    const size = bytesToSize(item.size);
    const created_at = item.created_at && format(item.created_at, 'MMM dd, yyyy HH:mm');
    const updated_at = item.updated_at && format(item.updated_at, 'MMM dd, yyyy HH:mm');

    content = (
      <div>
        <Stack
          alignItems="center"
          direction="row"
          justifyContent="flex-end"
          spacing={2}
          sx={{ p: 3 }}
        >
          <IconButton onClick={() => onFavorite?.(item.id, !item.isFavorite)}>
            <SvgIcon
              fontSize="small"
              sx={{ color: item.isFavorite ? 'warning.main' : 'action.active' }}
            >
              <Star01Icon />
            </SvgIcon>
          </IconButton>
          <IconButton onClick={onClose}>
            <SvgIcon fontSize="small">
              <XIcon />
            </SvgIcon>
          </IconButton>
        </Stack>
        <Divider />
        <Box
          sx={{
            px: 3,
            py: 2,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Box
              sx={{
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'neutral.800' : 'neutral.50',
                borderColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'neutral.500' : 'neutral.300',
                borderRadius: 1,
                borderStyle: 'dashed',
                borderWidth: 1,
                display: 'inline-flex',
                justifyContent: 'center',
                p: 2.5,
              }}
            >
              <ItemIcon type={item.type} extension={item.extension} />
            </Box>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              {isEditing ? (
                <TextField
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  size="small"
                  variant="outlined"
                  fullWidth
                  inputProps={{ maxLength: 120 }}
                  disabled={renameLoading}
                />
              ) : (
                <Typography
                  variant="h6"
                  noWrap
                  title={item.name}
                  sx={{ maxWidth: 240 }}
                >
                  {item.name}
                </Typography>
              )}
              {item.path && (
                <Typography
                  color="text.secondary"
                  variant="caption"
                  noWrap
                  title={item.path}
                  sx={{ maxWidth: 240 }}
                >
                  {item.path}
                </Typography>
              )}
            </Stack>
            <Box sx={{ flexGrow: 1 }} />
            {isEditing ? (
              <Stack direction="row" spacing={1}>
                <IconButton
                  disabled={renameLoading || name.trim() === '' || name.trim() === item.name}
                  onClick={() => {
                    onRename?.(item.id, name.trim(), item.type);
                    toast.success(t(tokens.fileManager.renameSuccess));
                    setIsEditing(false);
                  }}
                >
                  <SvgIcon fontSize="small">
                    <CheckIcon />
                  </SvgIcon>
                </IconButton>
                <IconButton
                  disabled={renameLoading}
                  onClick={() => {
                    setName(item.name);
                    setIsEditing(false);
                  }}
                >
                  <SvgIcon fontSize="small">
                    <CloseIcon />
                  </SvgIcon>
                </IconButton>
              </Stack>
            ) : (
              <IconButton onClick={() => setIsEditing(true)}>
                <SvgIcon fontSize="small">
                  <Edit02Icon />
                </SvgIcon>
              </IconButton>
            )}
          </Stack>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography color="text.secondary" variant="caption" sx={{ minWidth: 120 }}>
                {t(tokens.fileManager.sizeLabel)}
              </Typography>
              <Typography variant="body2">{size}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography color="text.secondary" variant="caption" sx={{ minWidth: 120 }}>
                {t(tokens.fileManager.createdAtLabel)}
              </Typography>
              <Typography variant="body2">{created_at || '-'}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography color="text.secondary" variant="caption" sx={{ minWidth: 120 }}>
                {t(tokens.fileManager.modifiedAtLabel)}
              </Typography>
              <Typography variant="body2">{updated_at || '-'}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography color="text.secondary" variant="caption" sx={{ minWidth: 120 }}>
                {t(tokens.fileManager.tagsLabel)}
              </Typography>
              <ItemTags tags={item.tags} onChange={(tags: string[]) => onTagsChange?.(item.id, tags)} />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography color="text.secondary" variant="caption" sx={{ minWidth: 120 }}>
                {t(tokens.fileManager.sharedWithLabel)}
              </Typography>
              <ItemShared isPublic={item.isPublic} shared={item.shared} />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography color="text.secondary" variant="caption" sx={{ minWidth: 120 }}>
                {t(tokens.common.lblActions)}
              </Typography>
              <IconButton onClick={() => onDelete?.(item.id)}>
                <SvgIcon fontSize="small">
                  <Trash02Icon />
                </SvgIcon>
              </IconButton>
            </Stack>
          </Stack>
        </Box>
      </div>
    );
  }

  return (
    <Drawer
      anchor="right"
      ModalProps={{
        sx: {
          [`& .${backdropClasses.root}`]: {
            background: 'transparent !important',
          },
        },
      }}
      onClose={onClose}
      open={open}
      PaperProps={{
        sx: {
          maxWidth: '100%',
          width: 400,
        },
      }}
    >
      {content}
    </Drawer>
  );
};

ItemDrawer.propTypes = {
  // @ts-ignore
  item: PropTypes.object,
  onClose: PropTypes.func,
  onDelete: PropTypes.func,
  onFavorite: PropTypes.func,
  onTagsChange: PropTypes.func,
  onRename: PropTypes.func,
  renameLoading: PropTypes.bool,
  open: PropTypes.bool,
};
