import type { FC } from 'react';
import PropTypes from 'prop-types';
import Link01Icon from '@untitled-ui/icons-react/build/esm/Link01';
import InfoCircleIcon from '@untitled-ui/icons-react/build/esm/InfoCircle';
import Trash02Icon from '@untitled-ui/icons-react/build/esm/Trash02';
import Menu from '@mui/material/Menu';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';
import SvgIcon from '@mui/material/SvgIcon';

interface ItemMenuProps {
  anchorEl?: HTMLElement | null;
  onClose?: () => void;
  onDelete?: () => void;
  onOpenDetails?: () => void;
  open?: boolean;
}

export const ItemMenu: FC<ItemMenuProps> = (props) => {
  const { anchorEl, onClose, onDelete, onOpenDetails, open = false } = props;

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
      <MenuItem onClick={onClose}>
        <SvgIcon fontSize="small">
          <Link01Icon />
        </SvgIcon>
        Copy Link
      </MenuItem>
      <MenuItem onClick={onOpenDetails}>
        <SvgIcon fontSize="small">
          <InfoCircleIcon />
        </SvgIcon>
        Details
      </MenuItem>
      <MenuItem
        onClick={onDelete}
        sx={{ color: 'error.main' }}
      >
        <SvgIcon fontSize="small">
          <Trash02Icon />
        </SvgIcon>
        Delete
      </MenuItem>
    </Menu>
  );
};

ItemMenu.propTypes = {
  anchorEl: PropTypes.any,
  onClose: PropTypes.func,
  onDelete: PropTypes.func,
  onOpenDetails: PropTypes.func,
  open: PropTypes.bool,
};
