import type { FC } from 'react';
import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import Star01Icon from '@untitled-ui/icons-react/build/esm/Star01';
import DotsVerticalIcon from '@untitled-ui/icons-react/build/esm/DotsVertical';
import Globe01Icon from '@untitled-ui/icons-react/build/esm/Globe03';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { usePopover } from 'src/hooks/use-popover';
import type { Item } from 'src/types/file-manager';
import { bytesToSize } from 'src/utils/bytes-to-size';
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';

import { ItemIcon } from './item-icon';
import { ItemMenu } from './item-menu';

interface ItemListCardProps {
  item: Item;
  onDelete?: (itemId: string) => void;
  onFavorite?: (itemId: string, value: boolean) => void;
  onOpen?: (itemId: string) => void;
  onOpenDetails?: (itemId: string) => void;
  onCopyLink?: (itemId: string) => void;
}

export const ItemListCard: FC<ItemListCardProps> = (props) => {
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

  const folderCount = item.itemsCount ?? 0;
  const sizeForDisplay = bytesToSize(item.size);
  const size = item.type === 'folder'
    ? t(tokens.fileManager.folderSummary, { size: sizeForDisplay, count: folderCount })
    : sizeForDisplay;

  const created_at = item.created_at ? format(item.created_at, 'MMM dd, yyyy') : null;
  const showCreatedAt = item.type !== 'folder';
  const showShared = !item.isPublic && (item.shared || []).length > 0;

  return (
    <>
      <Card
        key={item.id}
        sx={{
          backgroundColor: 'transparent',
          boxShadow: 0,
          transition: (theme) =>
            theme.transitions.create(['background-color, box-shadow'], {
              easing: theme.transitions.easing.easeInOut,
              duration: 200,
            }),
          '&:hover': {
            backgroundColor: 'background.paper',
            boxShadow: 16,
          },
        }}
        variant="outlined"
      >
        <Stack
          alignItems="center"
          direction="row"
          justifyContent="space-between"
          spacing={3}
          sx={{
            pt: 2,
            px: 2,
          }}
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
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              mb: 1,
            }}
          >
            <Box
              onClick={() => onOpen?.(item.id)}
              sx={{
                display: 'inline-flex',
                cursor: 'pointer',
              }}
            >
              <ItemIcon
                type={item.type}
                extension={item.extension}
              />
            </Box>
          </Box>
          <Typography
            onClick={() => onOpen?.(item.id)}
            sx={{ cursor: 'pointer' }}
            variant="subtitle2"
          >
            {item.name}
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Stack
            alignItems="center"
            direction="row"
            justifyContent="space-between"
            spacing={1}
          >
            <div>
              <Typography
                color="text.secondary"
                variant="body2"
              >
                {size}
              </Typography>
            </div>
            <div>
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
            </div>
          </Stack>
          {showCreatedAt && (
            <Typography
              color="text.secondary"
              variant="caption"
            >
              {t(tokens.fileManager.createdAtOn, { date: created_at ?? '-' })}
            </Typography>
          )}
        </Box>
      </Card>
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

ItemListCard.propTypes = {
  // @ts-ignore
  item: PropTypes.object.isRequired,
  onDelete: PropTypes.func,
  onFavorite: PropTypes.func,
  onOpen: PropTypes.func,
  onOpenDetails: PropTypes.func,
  onCopyLink: PropTypes.func,
};
