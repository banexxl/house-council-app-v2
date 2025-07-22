import type { FC } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import IconButton from '@mui/material/IconButton';
import SvgIcon from '@mui/material/SvgIcon';
import Tooltip from '@mui/material/Tooltip';

import { useDialog } from 'src/hooks/use-dialog';

import { SearchDialog } from './search-dialog';

export const SearchButton: FC = () => {
  const dialog = useDialog();

  return (
    <>
      <Tooltip title="Search">
        <IconButton onClick={dialog.handleOpen}>
          <SvgIcon>
            <SearchIcon />
          </SvgIcon>
        </IconButton>
      </Tooltip>
      <SearchDialog
        onClose={dialog.handleClose}
        open={dialog.open}
      />
    </>
  );
};
