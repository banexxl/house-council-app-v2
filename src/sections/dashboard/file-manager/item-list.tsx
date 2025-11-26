import type { ChangeEvent, FC, MouseEvent } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import { Scrollbar } from 'src/components/scrollbar';
import type { Item } from 'src/types/file-manager';
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';

import { ItemListCard } from './item-list-card';
import { ItemListRow } from './item-list-row';
import { Typography } from '@mui/material';

type View = 'grid' | 'list';

const ROW_OPTIONS = [10, 20, 50];

interface ItemListProps {
  count?: number;
  items?: Item[];
  onDelete?: (itemId: string) => void;
  onFavorite?: (itemId: string, value: boolean) => void;
  onOpen?: (itemId: string) => void;
  onOpenDetails?: (itemId: string) => void;
  onCopyLink?: (itemId: string) => void;
  onPageChange?: (event: MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
  onRowsPerPageChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  page?: number;
  rowsPerPage?: number;
  view?: View;
  loading?: boolean;
}

export const ItemList: FC<ItemListProps> = (props) => {
  const {
    count = 0,
    items = [],
    onDelete,
    onFavorite,
    onOpen,
    onOpenDetails,
    onCopyLink,
    onPageChange = () => { },
    onRowsPerPageChange,
    page = 0,
    rowsPerPage = 10,
    view = 'grid',
    loading = false,
  } = props;
  const { t } = useTranslation();

  let content: JSX.Element;

  if (view === 'grid') {
    content = loading ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    ) : items.length === 0 ? (
      <Box
        sx={{
          py: 6,
          textAlign: 'center',
          color: 'text.secondary',
        }}
      >
        <Typography variant="subtitle1">{t(tokens.fileManager.emptyState)}</Typography>
      </Box>
    ) : (
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: 'repeat(3, 1fr)',
        }}
      >
        {items.map((item) => (
          <ItemListCard
            key={item.id}
            item={item}
            onDelete={onDelete}
            onFavorite={onFavorite}
            onOpen={onOpen}
            onOpenDetails={onOpenDetails}
            onCopyLink={onCopyLink}
          />
        ))}
      </Box>
    );
  } else {
    // Negative margin is a fix for the box shadow. The virtual scrollbar cuts it.
    content = loading ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    ) : items.length === 0 ? (
      <Box
        sx={{
          py: 6,
          textAlign: 'center',
          color: 'text.secondary',
        }}
      >
        <Typography variant="subtitle1">{t(tokens.fileManager.emptyState)}</Typography>
      </Box>
    ) : (
      <Box sx={{ m: -3 }}>
        <Scrollbar>
          <Box sx={{ p: 3 }}>
            <Table
              sx={{
                minWidth: 600,
                borderCollapse: 'separate',
                borderSpacing: '0 8px',
              }}
            >
              <TableBody>
                {items.map((item) => (
                  <ItemListRow
                    key={item.id}
                    item={item}
                    onDelete={onDelete}
                    onFavorite={onFavorite}
                    onOpen={onOpen}
                    onOpenDetails={onOpenDetails}
                    onCopyLink={onCopyLink}
                  />
                ))}
              </TableBody>
            </Table>
          </Box>
        </Scrollbar>
      </Box>
    );
  }

  const rowsValue = ROW_OPTIONS.includes(rowsPerPage) ? rowsPerPage : ROW_OPTIONS[0];

  return (
    <Stack spacing={view === 'list' ? 2 : 4}>
      {content}
      <TablePagination
        component="div"
        count={count}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        page={page}
        rowsPerPage={rowsValue}
        rowsPerPageOptions={ROW_OPTIONS}
        labelRowsPerPage={t(tokens.common.rowsPerPage)}
      />
    </Stack>
  );
};

ItemList.propTypes = {
  items: PropTypes.array,
  count: PropTypes.number,
  onDelete: PropTypes.func,
  onFavorite: PropTypes.func,
  onOpen: PropTypes.func,
  onOpenDetails: PropTypes.func,
  onCopyLink: PropTypes.func,
  onPageChange: PropTypes.func,
  onRowsPerPageChange: PropTypes.func,
  page: PropTypes.number,
  rowsPerPage: PropTypes.number,
  view: PropTypes.oneOf<View>(['grid', 'list']),
  loading: PropTypes.bool,
};
