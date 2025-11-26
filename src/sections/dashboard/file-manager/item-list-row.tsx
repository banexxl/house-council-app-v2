import type { FC } from 'react';
import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import Globe01Icon from '@untitled-ui/icons-react/build/esm/Globe03';
import Star01Icon from '@untitled-ui/icons-react/build/esm/Star01';
import DotsVerticalIcon from '@untitled-ui/icons-react/build/esm/DotsVertical';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ListItem from '@mui/material/ListItem';

import { usePopover } from 'src/hooks/use-popover';
import type { Item } from 'src/types/file-manager';
import { bytesToSize } from 'src/utils/bytes-to-size';
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';

import { ItemIcon } from './item-icon';
import { ItemMenu } from './item-menu';

interface ItemListRowProps {
  item: Item;
  onDelete?: (itemId: string) => void;
  onFavorite?: (itemId: string, value: boolean) => void;
  onOpen?: (itemId: string) => void;
  onOpenDetails?: (itemId: string) => void;
  onCopyLink?: (itemId: string) => void;
}

export const ItemListRow: FC<ItemListRowProps> = (props) => {
  const { item, onDelete, onFavorite, onOpen, onOpenDetails, onCopyLink } = props;
  const popover = usePopover<HTMLButtonElement>();
  const { t } = useTranslation();

  const handleDelete = useCallback((): void => {
    popover.handleClose();
    onDelete?.(item.id);
  }, [item, popover, onDelete]);

  const handleDetails = useCallback((): void => {
    popover.handleClose();
    onOpenDetails?.(item.id);
  }, [item.id, onOpenDetails, popover]);

  const handleCopyLink = useCallback(() => {
    onCopyLink?.(item.id);
    popover.handleClose();
  }, [item.id, onCopyLink, popover]);

  let size = bytesToSize(item.size);

  if (item.type === 'folder') {
    size = t(tokens.fileManager.folderSummary, { size, count: item.itemsCount });
  }

  const created_at = item.created_at ? format(item.created_at, 'MMM dd, yyyy') : null;
  const showShared = !item.isPublic && (item.shared || []).length > 0;

  return (
    <>
      <ListItem
        disableGutters
        sx={{
          mb: 1.5,
          px: 2,
          py: 1.5,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'transparent',
          boxShadow: 0,
          transition: (theme) =>
            theme.transitions.create(['background-color', 'box-shadow'], {
              easing: theme.transitions.easing.easeInOut,
              duration: 200,
            }),
          '&:last-of-type': {
            mb: 0,
          },
          '&:hover': {
            backgroundColor: 'background.paper',
            boxShadow: 8,
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={2}
          sx={{
            flexGrow: 1,
            minWidth: 0,
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            rowGap: 1,
          }}
        >
          <Stack
            alignItems="center"
            direction="row"
            spacing={2}
            sx={{ minWidth: 0, flexGrow: 1 }}
          >
            <Box
              onClick={() => onOpen?.(item.id)}
              sx={{ cursor: 'pointer' }}
            >
              <ItemIcon
                type={item.type}
                extension={item.extension}
              />
            </Box>
            <div style={{ minWidth: 0 }}>
              <Typography
                noWrap
                onClick={() => onOpen?.(item.id)}
                sx={{ cursor: 'pointer' }}
                variant="subtitle2"
              >
                {item.name}
              </Typography>
              <Typography
                color="text.secondary"
                noWrap
                variant="body2"
              >
                {size}
              </Typography>
            </div>
          </Stack>
          <Stack
            spacing={0.25}
            sx={{ minWidth: 160 }}
          >
            <Typography
              noWrap
              variant="subtitle2"
            >
              {t(tokens.fileManager.createdAtLabel)}
            </Typography>
            <Typography
              color="text.secondary"
              noWrap
              variant="body2"
            >
              {created_at ?? '-'}
            </Typography>
          </Stack>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
            {item.isPublic && (
              <Tooltip title={t(tokens.fileManager.public)}>
                <Avatar
                  sx={{
                    height: 32,
                    width: 32,
                  }}
                >
                  <SvgIcon fontSize="small">
                    <Globe01Icon />
                  </SvgIcon>
                </Avatar>
              </Tooltip>
            )}
            {showShared && (
              <AvatarGroup max={3}>
                {item.shared?.map((person) => (
                  <Avatar
                    key={person.name}
                    src={person.avatar}
                    sx={{
                      height: 32,
                      width: 32,
                    }}
                  />
                ))}
              </AvatarGroup>
            )}
          </Box>
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ ml: 2 }}
        >
          <IconButton onClick={() => onFavorite?.(item.id, !item.isFavorite)}>
            <SvgIcon
              fontSize="small"
              sx={{ color: item.isFavorite ? 'warning.main' : 'action.active' }}
            >
              <Star01Icon />
            </SvgIcon>
          </IconButton>
          <IconButton
            onClick={popover.handleOpen}
            ref={popover.anchorRef}
          >
            <SvgIcon fontSize="small">
              <DotsVerticalIcon />
            </SvgIcon>
          </IconButton>
        </Stack>
      </ListItem>
      <ItemMenu
        anchorEl={popover.anchorRef.current}
        onClose={popover.handleClose}
        onDelete={handleDelete}
        onOpenDetails={handleDetails}
        onCopyLink={handleCopyLink}
        open={popover.open}
      />
    </>
  );
};

ItemListRow.propTypes = {
  // @ts-ignore
  item: PropTypes.object.isRequired,
  onDelete: PropTypes.func,
  onFavorite: PropTypes.func,
  onOpen: PropTypes.func,
  onOpenDetails: PropTypes.func,
  onCopyLink: PropTypes.func,
};
