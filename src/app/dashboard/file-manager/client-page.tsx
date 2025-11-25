'use client';

import type { ChangeEvent, MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Upload01Icon from '@untitled-ui/icons-react/build/esm/Upload01';
import ArrowLeftIcon from '@untitled-ui/icons-react/build/esm/ArrowLeft';
import FolderPlusIcon from '@untitled-ui/icons-react/build/esm/FolderPlus';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { Grid, IconButton, useTheme, CircularProgress } from '@mui/material';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';

import { Seo } from 'src/components/seo';
import { useDialog } from 'src/hooks/use-dialog';
import { useSettings } from 'src/hooks/use-settings';
import { FileUploader } from 'src/sections/dashboard/file-manager/file-uploader';
import { ItemDrawer } from 'src/sections/dashboard/file-manager/item-drawer';
import { ItemList } from 'src/sections/dashboard/file-manager/item-list';
import { ItemSearch } from 'src/sections/dashboard/file-manager/item-search';
import { StorageStats } from 'src/sections/dashboard/file-manager/storage-stats';
import type { Item } from 'src/types/file-manager';
import { PopupModal } from 'src/components/modal-dialog';
import toast from 'react-hot-toast';

type View = 'grid' | 'list';

interface Filters {
  query?: string;
}

type SortDir = 'asc' | 'desc';

interface ItemsSearchState {
  filters: Filters;
  page: number;
  rowsPerPage: number;
  sortBy?: string;
  sortDir?: SortDir;
}

const useItemsSearch = () => {
  const [state, setState] = useState<ItemsSearchState>({
    filters: {
      query: undefined,
    },
    page: 0,
    rowsPerPage: 9,
    sortBy: 'created_at',
    sortDir: 'desc',
  });

  const handleFiltersChange = useCallback((filters: Filters): void => {
    setState((prevState) => ({
      ...prevState,
      filters,
    }));
  }, []);

  const handleSortChange = useCallback((sortDir: SortDir): void => {
    setState((prevState) => ({
      ...prevState,
      sortDir,
    }));
  }, []);

  const handlePageChange = useCallback(
    (event: MouseEvent<HTMLButtonElement> | null, page: number): void => {
      setState((prevState) => ({
        ...prevState,
        page,
      }));
    },
    []
  );

  const handleRowsPerPageChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setState((prevState) => ({
      ...prevState,
      rowsPerPage: parseInt(event.target.value, 10),
    }));
  }, []);

  return {
    handleFiltersChange,
    handleSortChange,
    handlePageChange,
    handleRowsPerPageChange,
    state,
  };
};

interface ItemsStoreState {
  items: Item[];
  itemsCount: number;
}

const useItemsStore = (searchState: ItemsSearchState, prefix: string, basePrefix: string) => {
  const [state, setState] = useState<ItemsStoreState>({
    items: [],
    itemsCount: 0,
  });
  const [loading, setLoading] = useState(false);

  const handleItemsGet = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: searchState.rowsPerPage.toString(),
        offset: (searchState.page * searchState.rowsPerPage).toString(),
      });
      if (searchState.filters.query) {
        params.set('search', searchState.filters.query);
      }
      if (prefix) {
        params.set('prefix', prefix);
      }
      const response = await fetch(`/api/storage/objects?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load files');
      }
      const payload = await response.json() as { items: any[]; count?: number };
      const items = (payload.items ?? []).map((item) => ({
        id: item.path,
        name: item.name,
        type: item.type === 'folder' ? 'folder' as const : 'file' as const,
        bucket: item.bucket,
        size: item.size ?? 0,
        created_at: item.created_at
          ? new Date(item.created_at).getTime()
          : item.last_accessed_at
            ? new Date(item.last_accessed_at).getTime()
            : item.updated_at
              ? new Date(item.updated_at).getTime()
              : null,
        updated_at: item.updated_at
          ? new Date(item.updated_at).getTime()
          : item.last_accessed_at
            ? new Date(item.last_accessed_at).getTime()
            : item.created_at
              ? new Date(item.created_at).getTime()
              : null,
        last_accessed_at: item.last_accessed_at ? new Date(item.last_accessed_at).getTime() : null,
        path: item.path,
        fullPath: basePrefix ? `${basePrefix}/${item.path}` : item.path,
        isFavorite: false,
      })) as Item[];
      setState({
        items,
        itemsCount: payload.count ?? items.length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [prefix, searchState]);

  useEffect(() => {
    handleItemsGet();
  }, [handleItemsGet]);

  const handleDelete = useCallback((itemId: string): void => {
    setState((prevState) => {
      return {
        ...prevState,
        items: prevState.items.filter((item) => item.id !== itemId),
      };
    });
  }, []);

  const handleFavorite = useCallback((itemId: string, value: boolean): void => {
    setState((prevState) => {
      return {
        ...prevState,
        items: prevState.items.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              isFavorite: value,
            };
          }

          return item;
        }),
      };
    });
  }, []);

  return {
    handleDelete,
    handleFavorite,
    loading,
    refresh: handleItemsGet,
    ...state,
  };
};

const useCurrentItem = (items: Item[], itemId?: string): Item | undefined => {
  return useMemo((): Item | undefined => {
    if (!itemId) {
      return undefined;
    }

    return items.find((item) => item.id === itemId);
  }, [items, itemId]);
};

interface ClientFileManagerPageProps {
  clientId: string;
}

export const ClientFileManagerPage = ({ clientId }: ClientFileManagerPageProps) => {
  const settings = useSettings();
  const theme = useTheme();
  const itemsSearch = useItemsSearch();
  const basePrefix = clientId ? `clients/${clientId}` : '';
  const [prefix, setPrefix] = useState('');
  const itemsStore = useItemsStore(itemsSearch.state, prefix, basePrefix);
  const [view, setView] = useState<View>('grid');
  const uploadDialog = useDialog();
  const detailsDialog = useDialog<string>();
  const currentItem = useCurrentItem(itemsStore.items, detailsDialog.data);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderDialogLoading, setFolderDialogLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogMessage, setDeleteDialogMessage] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteDialogLoading, setDeleteDialogLoading] = useState(false);
  const handleNavigateUp = useCallback(() => {
    if (!prefix) return;
    const parts = prefix.split('/').filter(Boolean);
    parts.pop();
    setPrefix(parts.join('/'));
    itemsSearch.handlePageChange(null, 0);
    detailsDialog.handleClose();
  }, [detailsDialog, itemsSearch, prefix]);

  const pathParts = prefix ? prefix.split('/').filter(Boolean) : [];

  const handleDelete = useCallback(
    async (itemId: string): Promise<void> => {
      const target = itemsStore.items.find((item) => item.id === itemId);
      if (target?.type === 'folder') {
        // Pre-fetch child count for messaging
        let count = 0;
        try {
          const params = new URLSearchParams({ prefix: target.id, limit: '1000' });
          const res = await fetch(`/api/storage/objects?${params.toString()}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            count = Array.isArray(data.items) ? data.items.length : 0;
          }
        } catch (e) {
          console.error('Failed to inspect folder contents', e);
        }
        setDeleteTargetId(itemId);
        setDeleteDialogMessage(`Delete folder "${target.name}"${count ? ` with ${count} item(s)` : ''}? This cannot be undone.`);
        setDeleteDialogOpen(true);
        return;
      }
      // This can be triggered from multiple places, ensure drawer is closed.
      detailsDialog.handleClose();
      try {
        await fetch('/api/storage/objects', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: itemId }),
        });
      } catch (error) {
        console.error('Failed to delete file', error);
      } finally {
        itemsStore.handleDelete(itemId);
      }
    },
    [detailsDialog, itemsStore]
  );

  const handleUpload = useCallback(
    async (files: File[]): Promise<void> => {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', prefix ? `${prefix}/${file.name}` : file.name);
        const res = await fetch('/api/storage/objects', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          console.error('Upload failed for', file.name);
        }
      }
      await itemsStore.refresh();
    },
    [itemsStore, prefix]
  );

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      return;
    }
    setFolderDialogLoading(true);
    const res = await fetch('/api/storage/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, name: newFolderName.trim() }),
    });
    if (!res.ok) {
      console.error('Failed to create folder');
      setFolderDialogLoading(false);
      return;
    }
    setNewFolderName('');
    setFolderDialogOpen(false);
    setFolderDialogLoading(false);
    await itemsStore.refresh();
  }, [itemsStore, newFolderName, prefix]);

  const handleCopyLink = useCallback(
    async (itemId: string) => {
      const target = itemsStore.items.find((i) => i.id === itemId);
      if (!target) return;
      try {
        if (target.type === 'folder') {
          await navigator.clipboard.writeText(target.fullPath ?? target.path ?? target.id);
          toast.success('Folder path copied');
          return;
        }
        const res = await fetch('/api/storage/sign-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucket: target.bucket,
            path: target.fullPath ?? target.path ?? target.id,
            ttlSeconds: 60 * 30,
          }),
        });
        if (!res.ok) {
          throw new Error('Failed to sign file');
        }
        const data = await res.json();
        const url = data?.signedUrl;
        if (url) {
          await navigator.clipboard.writeText(url);
          toast.success('Link copied');
        } else {
          throw new Error('Missing signed URL');
        }
      } catch (error) {
        console.error('Copy link failed', error);
        toast.error('Unable to copy link');
      }
    },
    [itemsStore.items]
  );

  const handleConfirmDeleteFolder = useCallback(async () => {
    if (!deleteTargetId) return;
    detailsDialog.handleClose();
    setDeleteDialogLoading(true);
    try {
      await fetch('/api/storage/folders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: deleteTargetId }),
      });
      itemsStore.handleDelete(deleteTargetId);
      await itemsStore.refresh();
    } catch (error) {
      console.error('Failed to delete folder', error);
    } finally {
      setDeleteDialogLoading(false);
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
      setDeleteDialogMessage('');
    }
  }, [deleteTargetId, detailsDialog, itemsStore]);

  return (
    <>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8,
        }}
      >
        <Container maxWidth={settings.stretch ? false : 'xl'}>
          <Grid
            container
            spacing={{
              xs: 3,
              lg: 4,
            }}
          >
            <Grid size={12}>
              <Stack
                direction="row"
                justifyContent="space-between"
                spacing={4}
              >
                <div>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h4">File Manager</Typography>
                  </Stack>
                </div>
                <Stack
                  alignItems="center"
                  direction="row"
                  spacing={2}
                >
                  <Button
                    onClick={() => setFolderDialogOpen(true)}
                    startIcon={
                      <SvgIcon>
                        <FolderPlusIcon />
                      </SvgIcon>
                    }
                    variant="outlined"
                  >
                    Add Folder
                  </Button>
                  <Button
                    onClick={uploadDialog.handleOpen}
                    startIcon={
                      <SvgIcon>
                        <Upload01Icon />
                      </SvgIcon>
                    }
                    variant="contained"
                  >
                    Upload
                  </Button>
                </Stack>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Stack
                spacing={{
                  xs: 3,
                  lg: 4,
                }}
              >
                <ItemSearch
                  onFiltersChange={itemsSearch.handleFiltersChange}
                  onSortChange={itemsSearch.handleSortChange}
                  onViewChange={setView}
                  sortBy={itemsSearch.state.sortBy}
                  sortDir={itemsSearch.state.sortDir}
                  view={view}
                />
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                  sx={{ px: 0.5 }}
                >
                  <Breadcrumbs aria-label="breadcrumb">
                    <Link
                      color="text.primary"
                      sx={{ cursor: 'pointer', color: theme.palette.primary.main }}
                      onClick={() => {
                        setPrefix('');
                        itemsSearch.handlePageChange(null, 0);
                        detailsDialog.handleClose();
                      }}
                    >
                      Root
                    </Link>
                    {pathParts.map((segment, idx) => {
                      const fullPath = pathParts.slice(0, idx + 1).join('/');
                      const isLast = idx === pathParts.length - 1;
                      return isLast ? (
                        <Typography key={fullPath} color={theme.palette.primary.main} variant="subtitle2">
                          {segment}
                        </Typography>
                      ) : (
                        <Link
                          key={fullPath}
                          color={theme.palette.primary.main}
                          sx={{ cursor: 'pointer' }}
                          onClick={() => {
                            setPrefix(fullPath);
                            itemsSearch.handlePageChange(null, 0);
                            detailsDialog.handleClose();
                          }}
                        >
                          {segment}
                        </Link>
                      );
                    })}
                  </Breadcrumbs>
                  {prefix && (
                    <IconButton
                      size="small"
                      onClick={handleNavigateUp}
                      sx={{ ml: 1 }}
                    >
                      <SvgIcon fontSize="small">
                        <ArrowLeftIcon />
                      </SvgIcon>
                    </IconButton>
                  )}
                </Stack>
                <ItemList
                  count={itemsStore.itemsCount}
                  items={itemsStore.items}
                  onDelete={handleDelete}
                  onFavorite={itemsStore.handleFavorite}
                  onOpen={(id) => {
                    const target = itemsStore.items.find((item) => item.id === id);
                    if (target?.type === 'folder') {
                      setPrefix(target.id);
                      itemsSearch.handlePageChange(null, 0);
                      detailsDialog.handleClose();
                      return;
                    }
                    detailsDialog.handleOpen(id);
                  }}
                  onOpenDetails={(id) => {
                    detailsDialog.handleOpen(id);
                  }}
                  onCopyLink={handleCopyLink}
                  onPageChange={itemsSearch.handlePageChange}
                  onRowsPerPageChange={itemsSearch.handleRowsPerPageChange}
                  page={itemsSearch.state.page}
                  rowsPerPage={itemsSearch.state.rowsPerPage}
                  view={view}
                />
                {itemsStore.loading && (
                  <Stack alignItems="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} />
                  </Stack>
                )}
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <StorageStats />
            </Grid>
          </Grid>
        </Container>
      </Box>
      <ItemDrawer
        item={currentItem}
        onClose={detailsDialog.handleClose}
        onDelete={handleDelete}
        onFavorite={itemsStore.handleFavorite}
        open={detailsDialog.open}
      />
      <FileUploader onClose={uploadDialog.handleClose} onUpload={handleUpload} open={uploadDialog.open} />
      <Dialog open={folderDialogOpen} onClose={() => !folderDialogLoading && setFolderDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Folder name"
            margin="dense"
            required
            disabled={folderDialogLoading}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFolderDialogOpen(false)} disabled={folderDialogLoading}>Cancel</Button>
          <Button
            onClick={handleCreateFolder}
            variant="contained"
            disabled={!newFolderName.trim() || folderDialogLoading}
          >
            {folderDialogLoading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      <PopupModal
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogLoading(false);
          setDeleteDialogOpen(false);
          setDeleteTargetId(null);
          setDeleteDialogMessage('');
        }}
        onConfirm={handleConfirmDeleteFolder}
        title="Delete folder"
        type="confirmation"
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleteDialogLoading}
      >
        {deleteDialogMessage}
      </PopupModal>
    </>
  );
};
