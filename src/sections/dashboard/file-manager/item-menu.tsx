import type { FC } from 'react';
import PropTypes from 'prop-types';
import Link01Icon from '@untitled-ui/icons-react/build/esm/Link01';
import InfoCircleIcon from '@untitled-ui/icons-react/build/esm/InfoCircle';
import Trash02Icon from '@untitled-ui/icons-react/build/esm/Trash02';
import Menu from '@mui/material/Menu';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';
import SvgIcon from '@mui/material/SvgIcon';
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';

interface ItemMenuProps {
  anchorEl?: HTMLElement | null;
  onClose?: () => void;
  onDelete?: () => void;
  onOpenDetails?: () => void;
  onCopyLink?: () => void;
  open?: boolean;
}

export const ItemMenu: FC<ItemMenuProps> = (props) => {
  const { anchorEl, onClose, onDelete, onOpenDetails, onCopyLink, open = false } = props;
  const { t } = useTranslation();

  return (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        horizontal: 'right',
        vertical: 'bottom',
      }}
      onClose={onClose}
      open={open}
      sx={{
        [`& .${menuItemClasses.root}`]: {
          fontSize: 14,
          '& svg': {
            mr: 1,
          },
        },
      }}
      transformOrigin={{
        horizontal: 'right',
        vertical: 'top',
      }}
    >
      <MenuItem
        onClick={() => {
          onCopyLink?.();
          onClose?.();
        }}
      >
        <SvgIcon fontSize="small">
          <Link01Icon />
        </SvgIcon>
        {t(tokens.fileManager.copyLink)}
      </MenuItem>
      <MenuItem onClick={onOpenDetails}>
        <SvgIcon fontSize="small">
          <InfoCircleIcon />
        </SvgIcon>
        {t(tokens.fileManager.details)}
      </MenuItem>
      <MenuItem
        onClick={onDelete}
        sx={{ color: 'error.main' }}
      >
        <SvgIcon fontSize="small">
          <Trash02Icon />
        </SvgIcon>
        {t(tokens.common.btnDelete)}
      </MenuItem>
    </Menu>
  );
};

ItemMenu.propTypes = {
  anchorEl: PropTypes.any,
  onClose: PropTypes.func,
  onDelete: PropTypes.func,
  onOpenDetails: PropTypes.func,
  onCopyLink: PropTypes.func,
  open: PropTypes.bool,
};
