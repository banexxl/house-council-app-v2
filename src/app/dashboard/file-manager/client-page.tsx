'use client';

import type { ChangeEvent, MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Upload01Icon from '@untitled-ui/icons-react/build/esm/Upload01';
import ArrowLeftIcon from '@untitled-ui/icons-react/build/esm/ArrowLeft';
import FolderPlusIcon from '@untitled-ui/icons-react/build/esm/FolderPlus';
import RefreshCcw01Icon from '@untitled-ui/icons-react/build/esm/RefreshCcw01';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { Grid, IconButton, useTheme } from '@mui/material';
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
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';

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
    rowsPerPage: 10,
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
  folderCounts: Record<string, number>;
  folderSizes: Record<string, number>;
  folderDates: Record<string, number | null>;
}

const useItemsStore = (searchState: ItemsSearchState, prefix: string, basePrefix: string) => {
  const [state, setState] = useState<ItemsStoreState>({
    items: [],
    itemsCount: 0,
    folderCounts: {},
    folderSizes: {},
    folderDates: {},
  });
  const [loading, setLoading] = useState(false);

  const handleItemsGet = useCallback(async () => {
    try {
      setLoading(true);
      const normalizeFolderKey = (path: string) => {
        const clean = (path || '').replace(/^\/+|\/+$/g, '');
        const currentPrefix = (prefix || '').replace(/^\/+|\/+$/g, '');
        if (currentPrefix && clean.startsWith(`${currentPrefix}/`)) {
          return clean.slice(currentPrefix.length + 1);
        }
        if (basePrefix && clean.startsWith(`${basePrefix}/`)) {
          return clean.slice(basePrefix.length + 1);
        }
        if (basePrefix && clean === basePrefix) return '';
        return clean.replace(/^clients\/[^/]+\/?/, '');
      };
      const resolveFolderMeta = (
        map: Record<string, number>,
        path: string,
      ): number => {
        const clean = (path || '').replace(/^\/+|\/+$/g, '');
        const noClient = clean.replace(/^clients\/[^/]+\/?/, '');
        const currentPrefix = (prefix || '').replace(/^\/+|\/+$/g, '');
        const variants = Array.from(
          new Set([
            normalizeFolderKey(clean),
            clean,
            noClient,
            currentPrefix && noClient.startsWith(`${currentPrefix}/`)
              ? noClient.slice(currentPrefix.length + 1)
              : noClient,
          ].filter((v) => v !== undefined && v !== null)),
        );
        for (const key of variants) {
          if (key !== undefined && key !== null && key in map) return map[key] ?? 0;
        }
        return 0;
      };
      const resolveFolderDate = (path: string): number | null => {
        const clean = (path || '').replace(/^\/+|\/+$/g, '');
        const noClient = clean.replace(/^clients\/[^/]+\/?/, '');
        const currentPrefix = (prefix || '').replace(/^\/+|\/+$/g, '');
        const variants = Array.from(
          new Set([
            normalizeFolderKey(clean),
            clean,
            noClient,
            currentPrefix && noClient.startsWith(`${currentPrefix}/`)
              ? noClient.slice(currentPrefix.length + 1)
              : noClient,
          ].filter((v) => v !== undefined && v !== null)),
        );
        for (const key of variants) {
          if (key !== undefined && key !== null && key in folderDates) {
            const val = folderDates[key];
            if (val) return val;
          }
        }
        return null;
      };
      const sizePromise = (async () => {
        const params = new URLSearchParams();
        if (prefix) params.set('prefix', prefix);
        const query = params.toString();
        const res = await fetch(query ? `/api/storage/size?${query}` : '/api/storage/size', { cache: 'no-store' });
        if (!res.ok) return { counts: {}, sizes: {}, dates: {} };
        const data = await res.json();
        return {
          counts: (data?.folderCounts as Record<string, number>) ?? {},
          sizes: (data?.folderSizes as Record<string, number>) ?? {},
          dates: (data?.folderDates as Record<string, number | null>) ?? {},
        };
      })();
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
      const { counts: folderCounts, sizes: folderSizes, dates: folderDates } = await sizePromise;
      const toTimestamp = (value?: string | number | null): number | null => {
        if (!value) return null;
        const num = typeof value === 'number' ? value : new Date(value).getTime();
        return Number.isFinite(num) ? num : null;
      };
      const items = (payload.items ?? []).map((item) => ({
        id: item.path,
        name: item.name,
        type: item.type === 'folder' ? 'folder' as const : 'file' as const,
        bucket: item.bucket,
        size: item.size ?? 0,
        created_at: item.type === 'folder'
          ? toTimestamp(item.created_at)
            ?? toTimestamp(item.updated_at)
            ?? toTimestamp(item.last_accessed_at)
            ?? resolveFolderDate(item.path ?? '')
          : toTimestamp(item.created_at)
            ?? toTimestamp(item.last_accessed_at)
            ?? toTimestamp(item.updated_at),
        updated_at: toTimestamp(item.updated_at)
          ?? toTimestamp(item.last_accessed_at)
          ?? toTimestamp(item.created_at),
        last_accessed_at: toTimestamp(item.last_accessed_at),
        path: item.path,
        fullPath: (() => {
          const path = item.path ?? '';
          if (!path) return item.id;
          if (basePrefix && (path.startsWith(basePrefix) || path.startsWith('clients/'))) {
            return path;
          }
          return basePrefix ? `${basePrefix}/${path}` : path;
        })(),
        isFavorite: false,
        itemsCount:
          item.type === 'folder'
            ? resolveFolderMeta(folderCounts, item.path ?? '')
            : item.itemsCount,
        size:
          item.type === 'folder'
            ? resolveFolderMeta(folderSizes, item.path ?? '')
            : item.size ?? 0,
      })) as Item[];
      setState({
        items,
        itemsCount: payload.count ?? items.length,
        folderCounts,
        folderSizes,
        folderDates,
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
  userId: string;
}

export const ClientFileManagerPage = ({ userId }: ClientFileManagerPageProps) => {
  const settings = useSettings();
  const theme = useTheme();
  const { t } = useTranslation();
  const itemsSearch = useItemsSearch();
  const basePrefix = userId ? `users/${userId}` : '';
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
  const [deleteTargetType, setDeleteTargetType] = useState<'file' | 'folder' | null>(null);
  const [deleteDialogLoading, setDeleteDialogLoading] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);
  const deleteDialogTitle =
    deleteTargetType === 'folder' ? t(tokens.fileManager.deleteFolderTitle) : t(tokens.fileManager.deleteFileTitle);

  const signFileUrl = useCallback(
    async (item: Item, { silent = false }: { silent?: boolean } = {}): Promise<string | null> => {
      const targetPath = (item.fullPath ?? item.path ?? item.id)?.replace(/^\/+/, '');
      if (!item.bucket || !targetPath) {
        if (!silent) {
          toast.error(t(tokens.fileManager.copyLinkFailed));
        }
        return null;
      }
      try {
        const res = await fetch('/api/storage/sign-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucket: item.bucket,
            path: targetPath,
            ttlSeconds: 60 * 30,
          }),
        });
        if (!res.ok) {
          throw new Error('Failed to sign file');
        }
        const data = await res.json();
        return data?.signedUrl ?? null;
      } catch (err) {
        console.error('signFileUrl failed', err);
        if (!silent) {
          toast.error(t(tokens.fileManager.copyLinkFailed));
        }
        return null;
      }
    },
    [t]
  );
  const handleNavigateUp = useCallback(() => {
    if (!prefix) return;
    const parts = prefix.split('/').filter(Boolean);
    parts.pop();
    setPrefix(parts.join('/'));
    itemsSearch.handlePageChange(null, 0);
    detailsDialog.handleClose();
  }, [detailsDialog, itemsSearch, prefix]);

  const pathParts = prefix ? prefix.split('/').filter(Boolean) : [];
  const rootLabel = t(tokens.fileManager.root);
  const normalizePrefixId = useCallback(
    (id: string) => {
      if (basePrefix && id.startsWith(`${basePrefix}/`)) {
        return id.slice(basePrefix.length + 1);
      }
      const clientPattern = /^clients\/[^/]+\/?/;
      if (clientPattern.test(id)) {
        return id.replace(clientPattern, '');
      }
      return id;
    },
    [basePrefix]
  );

  const handleDelete = useCallback(
    async (itemId: string): Promise<void> => {
      const target = itemsStore.items.find((item) => item.id === itemId);
      if (!target) return;
      let message = t(tokens.fileManager.deleteFileMessage, { name: target.name });
      if (target.type === 'folder') {
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
        if (count) {
          message = t(tokens.fileManager.deleteFolderWithCountMessage, {
            name: target.name,
            count,
          });
        } else {
          message = t(tokens.fileManager.deleteFolderMessage, { name: target.name });
        }
      }
      setDeleteTargetId(itemId);
      setDeleteTargetType(target.type);
      setDeleteDialogMessage(message);
      setDeleteDialogOpen(true);
    },
    [itemsStore, t]
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
          toast.success(t(tokens.fileManager.folderPathCopied));
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
          toast.success(t(tokens.fileManager.linkCopied));
        } else {
          throw new Error('Missing signed URL');
        }
      } catch (error) {
        console.error('Copy link failed', error);
        toast.error(t(tokens.fileManager.copyLinkFailed));
      }
    },
    [itemsStore.items, t]
  );

  const handleRename = useCallback(
    async (itemId: string, newName: string, type: 'file' | 'folder') => {
      if (!newName.trim()) return;
      setRenameLoading(true);
      try {
        if (type === 'folder') {
          await fetch('/api/storage/folders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prefix: itemId, newName }),
          });
        } else {
          await fetch('/api/storage/objects', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: itemId, newName }),
          });
        }
        // Derive new id to keep drawer open on renamed item
        const parts = itemId.split('/').filter(Boolean);
        parts.pop();
        const newId = [...parts, newName].filter(Boolean).join('/');
        detailsDialog.handleOpen(newId);
        await itemsStore.refresh();
      } catch (error) {
        console.error('Rename failed', error);
        toast.error(t(tokens.fileManager.renameFailed));
      } finally {
        setRenameLoading(false);
      }
    },
    [detailsDialog, itemsStore, t]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTargetId || !deleteTargetType) return;
    detailsDialog.handleClose();
    setDeleteDialogLoading(true);
    try {
      if (deleteTargetType === 'folder') {
        await fetch('/api/storage/folders', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefix: deleteTargetId }),
        });
      } else {
        await fetch('/api/storage/objects', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: deleteTargetId }),
        });
      }
      itemsStore.handleDelete(deleteTargetId);
      await itemsStore.refresh();
    } catch (error) {
      console.error('Failed to delete item', error);
    } finally {
      setDeleteDialogLoading(false);
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
      setDeleteTargetType(null);
      setDeleteDialogMessage('');
    }
  }, [deleteTargetId, deleteTargetType, detailsDialog, itemsStore]);

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
                    <Typography variant="h4">{t(tokens.nav.fileManager)}</Typography>
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
                    {t(tokens.fileManager.addFolder)}
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
                    {t(tokens.common.btnUpload)}
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
                      sx={{
                        cursor: 'pointer',
                        color: theme.palette.primary.main,
                        maxWidth: 220,
                        display: 'inline-block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={rootLabel}
                      onClick={() => {
                        setPrefix('');
                        itemsSearch.handlePageChange(null, 0);
                        detailsDialog.handleClose();
                      }}
                    >
                      {rootLabel}
                    </Link>
                    {pathParts.map((segment, idx) => {
                      const fullPath = pathParts.slice(0, idx + 1).join('/');
                      const isLast = idx === pathParts.length - 1;
                      return isLast ? (
                        <Typography
                          key={fullPath}
                          color={theme.palette.primary.main}
                          variant="subtitle2"
                          sx={{
                            maxWidth: 180,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={segment}
                        >
                          {segment}
                        </Typography>
                      ) : (
                        <Link
                          key={fullPath}
                          color={theme.palette.primary.main}
                          sx={{
                            cursor: 'pointer',
                            maxWidth: 180,
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={fullPath}
                          onClick={() => {
                            setPrefix(normalizePrefixId(fullPath));
                            itemsSearch.handlePageChange(null, 0);
                            detailsDialog.handleClose();
                          }}
                        >
                          {segment}
                        </Link>
                      );
                    })}
                  </Breadcrumbs>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconButton
                      size="small"
                      onClick={handleNavigateUp}
                      disabled={!prefix}
                      aria-label="Go back"
                      title="Go back"
                    >
                      <SvgIcon fontSize="small" sx={{ color: theme.palette.primary.main }}>
                        <ArrowLeftIcon />
                      </SvgIcon>
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        void itemsStore.refresh();
                      }}
                      disabled={itemsStore.loading}
                      aria-label="Refresh files"
                      title="Refresh files"
                    >
                      <SvgIcon fontSize="small" sx={{ color: theme.palette.primary.main }}>
                        <RefreshCcw01Icon />
                      </SvgIcon>
                    </IconButton>
                  </Stack>
                </Stack>
                <ItemList
                  count={itemsStore.itemsCount}
                  items={itemsStore.items}
                  onDelete={handleDelete}
                  onFavorite={itemsStore.handleFavorite}
                  onOpen={async (id) => {
                    const target = itemsStore.items.find((item) => item.id === id);
                    if (target?.type === 'folder') {
                      const nextPrefix = normalizePrefixId(target.id);
                      setPrefix(nextPrefix);
                      itemsSearch.handlePageChange(null, 0);
                      detailsDialog.handleClose();
                      return;
                    }
                    detailsDialog.handleOpen(id);
                    if (target && target.type === 'file') {
                      if (typeof window !== 'undefined') {
                        const pendingTab = window.open('about:blank', '_blank', 'noopener,noreferrer');
                        const url = await signFileUrl(target);
                        if (url) {
                          if (pendingTab) {
                            pendingTab.location.replace(url);
                          } else {
                            const opened = window.open(url, '_blank', 'noopener,noreferrer');
                            if (!opened) {
                              toast.error(t(tokens.fileManager.copyLinkFailed));
                            }
                          }
                        } else {
                          pendingTab?.close();
                          toast.error(t(tokens.fileManager.copyLinkFailed));
                        }
                      }
                    }
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
                  loading={itemsStore.loading}
                />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <StorageStats userId={userId} />
            </Grid>
          </Grid>
        </Container>
      </Box>
      <ItemDrawer
        item={currentItem}
        onClose={detailsDialog.handleClose}
        onDelete={handleDelete}
        onFavorite={itemsStore.handleFavorite}
        onRename={handleRename}
        renameLoading={renameLoading}
        open={detailsDialog.open}
      />
      <FileUploader onClose={uploadDialog.handleClose} onUpload={handleUpload} open={uploadDialog.open} />
      <Dialog open={folderDialogOpen} onClose={() => !folderDialogLoading && setFolderDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t(tokens.fileManager.createFolderTitle)}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t(tokens.fileManager.folderNameLabel)}
            margin="dense"
            required
            disabled={folderDialogLoading}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFolderDialogOpen(false)} disabled={folderDialogLoading}>{t(tokens.common.btnCancel)}</Button>
          <Button
            onClick={handleCreateFolder}
            variant="contained"
            disabled={!newFolderName.trim() || folderDialogLoading}
          >
            {folderDialogLoading ? t(tokens.fileManager.creatingFolder) : t(tokens.common.btnCreate)}
          </Button>
        </DialogActions>
      </Dialog>
      <PopupModal
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogLoading(false);
          setDeleteDialogOpen(false);
          setDeleteTargetId(null);
          setDeleteTargetType(null);
          setDeleteDialogMessage('');
        }}
        onConfirm={handleConfirmDelete}
        title={deleteDialogTitle}
        type="confirmation"
        confirmText={t(tokens.common.btnDelete)}
        cancelText={t(tokens.common.btnCancel)}
        loading={deleteDialogLoading}
      >
        {deleteDialogMessage}
      </PopupModal>
    </>
  );
};
