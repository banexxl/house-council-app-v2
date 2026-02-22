"use client";

import { useState, useMemo, useCallback } from 'react';
import { Announcement, ANNOUNCEMENT_CATEGORIES, announcementCategoryLabelMap, announcementSubcategoryLabelMap } from 'src/types/announcement';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Badge from '@mui/material/Badge';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import PushPinIcon from '@mui/icons-material/PushPin';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { paths } from 'src/paths';
import { EntityFormHeader } from 'src/components/entity-form-header';
import { Button } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { upsertAnnouncement } from 'src/app/actions/announcement/announcement-actions';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Props {
     announcements: Announcement[];
     buildings?: Record<string, any>;
}

export default function TenantAnnouncementsViewer({ announcements, buildings = {} }: Props) {
     const { t } = useTranslation();
     const router = useRouter();
     const trPref = useCallback((k1: string, k2?: string, raw?: string) => {
          const v1 = t(k1 as any);
          if (v1 !== k1) return v1;
          if (k2) {
               const v2 = t(k2 as any);
               if (v2 !== k2) return v2;
          }
          return raw ?? k2 ?? k1;
     }, [t]);
     const [selectedId, setSelectedId] = useState<string | null>(announcements[0]?.id || null);
     const [search, setSearch] = useState('');
     const [category, setCategory] = useState<string>('');
     const [buildingFilter, setBuildingFilter] = useState<string>('');
     const [lightbox, setLightbox] = useState<{ open: boolean; url?: string }>({ open: false });
     const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
     const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
     const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
     const [newAnnouncementDescription, setNewAnnouncementDescription] = useState('');
     const [newAnnouncementCategory, setNewAnnouncementCategory] = useState('');
     const [newAnnouncementSubcategory, setNewAnnouncementSubcategory] = useState('');

     const categories = useMemo(() => Array.from(new Set(announcements.map(a => a.category).filter(Boolean))) as string[], [announcements]);
     const buildingOptions = useMemo(() => {
          const set = new Set<string>();
          announcements.forEach(a => (a.buildings || []).forEach(b => set.add(b)));
          return Array.from(set.values());
     }, [announcements]);
     const createBuildingIds = useMemo(() => {
          const fromMap = Object.keys(buildings || {});
          if (fromMap.length > 0) return fromMap;

          const set = new Set<string>();
          announcements.forEach(a => (a.buildings || []).forEach(id => set.add(id)));
          return Array.from(set);
     }, [announcements, buildings]);
     const selectedCreateCategory = useMemo(
          () => ANNOUNCEMENT_CATEGORIES.find(cat => cat.id === newAnnouncementCategory),
          [newAnnouncementCategory]
     );
     const requiresCreateSubcategory = (selectedCreateCategory?.subcategories.length ?? 0) > 0;
     const canSaveNewAnnouncement =
          newAnnouncementTitle.trim().length > 0 &&
          newAnnouncementDescription.trim().length > 0 &&
          !!newAnnouncementCategory &&
          (!requiresCreateSubcategory || !!newAnnouncementSubcategory);

     const filtered = useMemo(() => {
          const searchLower = search.trim().toLowerCase();
          return announcements.filter(a => {
               if (category && a.category !== category) return false;
               if (buildingFilter && !(a.buildings || []).includes(buildingFilter)) return false;
               if (!searchLower) return true;
               return (
                    (a.title || '').toLowerCase().includes(searchLower) ||
                    (a.message || '').toLowerCase().includes(searchLower)
               );
          });
     }, [announcements, search, category, buildingFilter]);

     // Order: pinned first, then newest by created_at
     const ordered = useMemo(() => {
          const arr = [...filtered];
          arr.sort((a: Announcement, b: Announcement) => {
               if (!!a.pinned !== !!b.pinned) return b.pinned ? 1 : -1; // true first
               const at = new Date(a.created_at).getTime();
               const bt = new Date(b.created_at).getTime();
               return bt - at; // newest first
          });
          return arr;
     }, [filtered]);

     const selected = useMemo(
          () => ordered.find(a => a.id === selectedId) || ordered[0] || null,
          [ordered, selectedId]
     );

     // Keep selection valid when filter changes
     useMemo(() => {
          if (selected && ordered.some(a => a.id === selected.id)) return;
          if (ordered.length) setSelectedId(ordered[0].id!);
          else setSelectedId(null);
     }, [ordered, selected]);

     const clearFilters = useCallback(() => {
          setSearch('');
          setCategory('');
          setBuildingFilter('');
     }, []);
     const resetCreateForm = useCallback(() => {
          setNewAnnouncementTitle('');
          setNewAnnouncementDescription('');
          setNewAnnouncementCategory('');
          setNewAnnouncementSubcategory('');
     }, []);

     const openCreateModal = useCallback(() => {
          resetCreateForm();
          setIsCreateModalOpen(true);
     }, [resetCreateForm]);

     const closeCreateModal = useCallback(() => {
          if (isCreatingAnnouncement) return;
          setIsCreateModalOpen(false);
     }, [isCreatingAnnouncement]);

     const saveNewAnnouncement = useCallback(async () => {
          if (isCreatingAnnouncement || !canSaveNewAnnouncement) return;

          if (!createBuildingIds.length) {
               toast.error(t('announcements.validation.buildingsRequired'));
               return;
          }

          const customerId = announcements.find(a => !!a.customerId)?.customerId;

          setIsCreatingAnnouncement(true);
          const safeMessage = newAnnouncementDescription
               .trim()
               .replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#39;')
               .replace(/\r?\n/g, '<br/>');

          const result = await upsertAnnouncement({
               title: newAnnouncementTitle.trim(),
               message: safeMessage,
               category: newAnnouncementCategory as Announcement['category'],
               subcategory: newAnnouncementSubcategory,
               buildings: createBuildingIds,
               pinned: false,
               schedule_enabled: false,
               scheduled_at: null,
               scheduled_timezone: null,
               status: 'published',
               customerId: customerId || undefined,
          });

          setIsCreatingAnnouncement(false);

          if (!result.success) {
               toast.error(result.error || t('common.actionCreateError'));
               return;
          }

          toast.success(t('common.actionCreateSuccess'));
          resetCreateForm();
          setIsCreateModalOpen(false);
          if (result.data?.id) setSelectedId(result.data.id);
          router.refresh();
     }, [
          announcements,
          canSaveNewAnnouncement,
          createBuildingIds,
          isCreatingAnnouncement,
          newAnnouncementCategory,
          newAnnouncementDescription,
          newAnnouncementSubcategory,
          newAnnouncementTitle,
          resetCreateForm,
          router,
          t
     ]);

     const openLightbox = useCallback((url: string) => setLightbox({ open: true, url }), []);
     const closeLightbox = useCallback(() => setLightbox({ open: false }), []);

     return (
          <Container maxWidth="xl">
               <Stack spacing={3}>
                    <EntityFormHeader
                         backHref={paths.dashboard.index}
                         backLabel={t('nav.dashboard')}
                         title={t('announcements.title')}
                         breadcrumbs={[
                              { title: t('nav.dashboard'), href: paths.dashboard.index },
                              { title: t('announcements.title') },
                         ]}
                         showNotificationAlert={false}
                         actionComponent={
                              <Button
                                   variant="contained"
                                   onClick={openCreateModal}
                                   disabled={isCreatingAnnouncement}
                                   sx={{ width: { xs: '100%', sm: 'auto' } }}
                              >
                                   {t('common.btnCreate')}
                              </Button>
                         }
                    />
                    <Card sx={{ p: 2, maxWidth: { xs: '100%', md: 1000, lg: 1200 }, mx: 'auto' }}>
                         <Box
                              display="flex"
                              gap={2}
                              sx={{
                                   width: '100%',
                                   alignItems: 'stretch',
                                   flexDirection: { xs: 'column', sm: 'row' },
                                   flexWrap: { xs: 'wrap', sm: 'nowrap' }
                              }}
                         >
                              {/* Left Pane */}
                              <Paper variant="outlined" sx={{ width: { xs: '100%', sm: '33.333%' }, display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>
                                   <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                             <TextField
                                                  size="small"
                                                  fullWidth
                                                  placeholder={t('announcements.searchPlaceholder')}
                                                  value={search}
                                                  onChange={e => setSearch(e.target.value)}
                                                  InputProps={{
                                                       startAdornment: (
                                                            <InputAdornment position="start">
                                                                 <SearchIcon fontSize="small" />
                                                            </InputAdornment>
                                                       )
                                                  }}
                                             />
                                             {(search || category || buildingFilter) && (
                                                  <Tooltip title={t('common.clearFilters')}>
                                                       <IconButton size="small" onClick={clearFilters}>
                                                            <FilterAltOffIcon fontSize="small" />
                                                       </IconButton>
                                                  </Tooltip>
                                             )}
                                        </Stack>
                                        <TextField
                                             select
                                             label={t('announcements.fields.category')}
                                             size="small"
                                             value={category}
                                             onChange={e => setCategory(e.target.value)}
                                             fullWidth
                                        >
                                             <MenuItem value="">{t('common.all')}</MenuItem>
                                             {categories.map(c => {
                                                  const label = trPref(`announcements.categories.${c}`, announcementCategoryLabelMap[c] ?? c, c);
                                                  return <MenuItem key={c} value={c}>{label}</MenuItem>;
                                             })}
                                        </TextField>
                                        <TextField
                                             select
                                             label={t('announcements.fields.building')}
                                             size="small"
                                             value={buildingFilter}
                                             onChange={e => setBuildingFilter(e.target.value)}
                                             fullWidth
                                        >
                                             <MenuItem value="">{t('common.all')}</MenuItem>
                                             {buildingOptions.map(b => {
                                                  const bd = buildings[b];
                                                  let label = b;
                                                  if (bd?.building_location) {
                                                       const loc = bd.building_location || {};
                                                       label = [loc.street_address, loc.street_number, loc.city].filter(Boolean).join(' ');
                                                  }
                                                  return <MenuItem key={b} value={b}>{label}</MenuItem>;
                                             })}
                                        </TextField>
                                   </Box>
                                   <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                                        <List disablePadding>
                                             {ordered.map((a: Announcement) => {
                                                  const imagesCount = Array.isArray(a.images) ? a.images.length : 0;
                                                  const docsCount = Array.isArray(a.documents) ? a.documents.length : 0;
                                                  return (
                                                       <ListItemButton
                                                            key={a.id}
                                                            selected={a.id === selectedId}
                                                            alignItems="flex-start"
                                                            onClick={() => setSelectedId(a.id!)}
                                                            sx={{
                                                                 py: 1.2,
                                                                 borderLeft: a.id === selectedId ? theme => `3px solid ${theme.palette.primary.main}` : '3px solid transparent',
                                                                 alignItems: 'center'
                                                            }}
                                                       >
                                                            <ListItemText
                                                                 primary={
                                                                      <Stack direction="row" spacing={1} alignItems="center" sx={{ maxWidth: '100%' }}>
                                                                           <Typography variant="subtitle2" noWrap sx={{ flexGrow: 1 }}>{a.title || t('common.untitled')}</Typography>
                                                                           {a.pinned && <Tooltip title={t('announcements.pinned')}><PushPinIcon color="warning" fontSize="small" /></Tooltip>}
                                                                           {a.schedule_enabled && a.scheduled_at && (
                                                                                <Tooltip title={t('announcements.scheduledAt', { date: new Date(a.scheduled_at).toLocaleString() })}>
                                                                                     <ScheduleIcon color="info" fontSize="small" />
                                                                                </Tooltip>
                                                                           )}
                                                                           {imagesCount > 0 && (
                                                                                <Tooltip title={t('announcements.imagesCount', { count: imagesCount })}>
                                                                                     <Badge badgeContent={imagesCount} color="primary" max={9}>
                                                                                          <ImageIcon fontSize="small" />
                                                                                     </Badge>
                                                                                </Tooltip>
                                                                           )}
                                                                           {docsCount > 0 && (
                                                                                <Tooltip title={t('announcements.documentsCount', { count: docsCount })}>
                                                                                     <Badge badgeContent={docsCount} color="secondary" max={9}>
                                                                                          <DescriptionIcon fontSize="small" />
                                                                                     </Badge>
                                                                                </Tooltip>
                                                                           )}
                                                                      </Stack>
                                                                 }
                                                                 secondary={
                                                                      <Typography variant="caption" color="text.secondary" noWrap>
                                                                           {new Date(a.created_at).toLocaleString()} · {(a.buildings || []).length} {t('announcements.buildingsShort', { count: (a.buildings || []).length })}
                                                                      </Typography>
                                                                 }
                                                            />
                                                       </ListItemButton>
                                                  );
                                             })}
                                             {filtered.length === 0 && (
                                                  <Box sx={{ p: 3, textAlign: 'center' }}>
                                                       <Typography variant="body2" color="text.secondary">{t('announcements.noneMatch')}</Typography>
                                                  </Box>
                                             )}
                                        </List>
                                   </Box>
                                   <Divider />
                                   <Box sx={{ p: 1, textAlign: 'right' }}>
                                        <Typography variant="caption" color="text.secondary">{t('announcements.countShown', { shown: ordered.length, total: announcements.length })}</Typography>
                                   </Box>
                              </Paper>

                              {/* Right Pane */}
                              <Paper variant="outlined" sx={{ flexGrow: 1, width: { xs: '100%', sm: '66.666%' }, display: 'flex', flexDirection: 'column', maxHeight: '70vh', minWidth: 0 }}>
                                   {!selected && (
                                        <Box sx={{ p: 4, textAlign: 'center' }}>
                                             <Typography variant="body2" color="text.secondary">{t('announcements.selectPrompt')}</Typography>
                                        </Box>
                                   )}
                                   {selected && (
                                        <>
                                             <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                  <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
                                                       <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                                                            <Typography variant="h5" sx={{ mb: 1, pr: 1 }} noWrap>{selected.title}</Typography>
                                                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                                 {selected.pinned && <Chip size="small" color="warning" label={t('announcements.pinned')} />}
                                                                 <Chip size="small" label={selected.status === 'published' ? t('announcements.status.published') : t('announcements.status.draft')} color={selected.status === 'published' ? 'success' : 'default'} />
                                                                 {selected.category && (
                                                                      <Chip
                                                                           size="small"
                                                                           label={trPref(`announcements.categories.${selected.category}`, announcementCategoryLabelMap[selected.category] ?? selected.category, selected.category)}
                                                                           variant="outlined"
                                                                      />
                                                                 )}
                                                                 {selected.subcategory && (
                                                                      <Chip
                                                                           size="small"
                                                                           label={trPref(`announcements.subcategories.${selected.subcategory}`, announcementSubcategoryLabelMap[selected.subcategory] ?? selected.subcategory, selected.subcategory)}
                                                                           variant="outlined"
                                                                      />
                                                                 )}
                                                                 {selected.schedule_enabled && selected.scheduled_at && <Chip size="small" color="info" label={t('announcements.scheduledAt', { date: new Date(selected.scheduled_at).toLocaleString() })} />}
                                                                 {(selected.images?.length || 0) > 0 && (
                                                                      <Chip
                                                                           size="small"
                                                                           variant="outlined"
                                                                           icon={<ImageIcon fontSize="small" />}
                                                                           label={t('announcements.imagesCount', { count: selected.images?.length ?? 0 })}
                                                                      />
                                                                 )}
                                                                 {Array.isArray(selected.documents) && selected.documents.length > 0 && (
                                                                      <Chip
                                                                           size="small"
                                                                           variant="outlined"
                                                                           icon={<DescriptionIcon fontSize="small" />}
                                                                           label={t('announcements.documentsCount', { count: selected.documents.length })}
                                                                      />
                                                                 )}
                                                            </Stack>
                                                       </Box>
                                                       <Stack spacing={0.5} sx={{ textAlign: 'right' }}>
                                                            <Typography variant="caption" color="text.secondary">{`${t('common.createdAt')} ${new Date(selected.created_at).toLocaleString()}`}</Typography>
                                                            {selected.updated_at && (
                                                                 <Typography variant="caption" color="text.secondary">{`${t('common.updatedAt')} ${new Date(selected.updated_at).toLocaleString()}`}</Typography>
                                                            )}
                                                       </Stack>
                                                  </Stack>
                                             </Box>
                                             <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
                                                  {(selected.buildings || []).length > 0 && (
                                                       <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                                                            {(selected.buildings || []).map(bid => {
                                                                 const b = buildings[bid];
                                                                 let label = bid;
                                                                 if (b?.building_location) {
                                                                      const loc = b.building_location || {};
                                                                      label = [loc.street_address, loc.street_number, loc.city].filter(Boolean).join(' ');
                                                                 }
                                                                 return <Chip key={bid} size="small" variant="outlined" label={label || bid} />;
                                                            })}
                                                       </Stack>
                                                  )}
                                                  {selected.message && (
                                                       <Box
                                                            sx={{
                                                                 mb: 4,
                                                                 lineHeight: 1.55,
                                                                 '& p': { margin: 0, marginBottom: 1 },
                                                                 '& ul, & ol': { paddingLeft: 3, marginTop: 0, marginBottom: 1 },
                                                                 '& h1, & h2, & h3, & h4, & h5, & h6': { marginTop: 1.5, marginBottom: 0.75 },
                                                                 '& a': { color: 'primary.main', textDecoration: 'underline' },
                                                                 '& strong, & b': { fontWeight: 600 },
                                                                 '& em, & i': { fontStyle: 'italic' },
                                                                 whiteSpace: 'normal',
                                                            }}
                                                            dangerouslySetInnerHTML={{ __html: selected.message }}
                                                       />
                                                  )}
                                                  {Array.isArray(selected.images) && selected.images.length > 0 && (
                                                       <Box sx={{ mb: 4 }}>
                                                            <Typography variant="subtitle1" gutterBottom>{t('announcements.images')}</Typography>
                                                            <Box
                                                                 sx={{
                                                                      display: 'grid',
                                                                      gap: 2,
                                                                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))'
                                                                 }}
                                                            >
                                                                 {selected.images.map((url: string, i: number) => (
                                                                      <Box
                                                                           key={i}
                                                                           onClick={() => openLightbox(url)}
                                                                           sx={{
                                                                                position: 'relative',
                                                                                cursor: 'pointer',
                                                                                borderRadius: 1,
                                                                                overflow: 'hidden',
                                                                                border: '1px solid',
                                                                                borderColor: 'divider',
                                                                                '&:hover img': { transform: 'scale(1.05)' }
                                                                           }}
                                                                      >
                                                                           <Box
                                                                                component="img"
                                                                                src={url}
                                                                                alt={`img-${i}`}
                                                                                sx={{
                                                                                     width: '100%',
                                                                                     height: 120,
                                                                                     objectFit: 'cover',
                                                                                     transition: 'transform .3s'
                                                                                }}
                                                                           />
                                                                      </Box>
                                                                 ))}
                                                            </Box>
                                                       </Box>
                                                  )}
                                                  {Array.isArray(selected.documents) && selected.documents.length > 0 && (
                                                       <Box sx={{ mb: 4 }}>
                                                            <Typography variant="subtitle1" gutterBottom>{t('announcements.documents')}</Typography>
                                                            <List dense>
                                                                 {selected.documents.map((d: any, i: number) => (
                                                                      <ListItemButton key={i} component="a" href={d.url} target="_blank" rel="noopener noreferrer" sx={{ borderRadius: 1 }}>
                                                                           <ListItemText
                                                                                primary={<Typography variant="body2">{d.name || t('announcements.documentWithIndex', { index: i + 1 })}</Typography>}
                                                                                secondary={<Typography variant="caption" color="text.secondary">{d.mime}</Typography>}
                                                                           />
                                                                      </ListItemButton>
                                                                 ))}
                                                            </List>
                                                       </Box>
                                                  )}
                                             </Box>
                                        </>
                                   )}
                              </Paper>
                              <Dialog open={lightbox.open} onClose={closeLightbox} maxWidth="md" fullWidth>
                                   <DialogTitle sx={{ pr: 5 }}>
                                        {t('announcements.lightbox.imagePreview')}
                                        <IconButton aria-label={t('common.close')} onClick={closeLightbox} sx={{ position: 'absolute', right: 8, top: 8 }}>
                                             <CloseIcon />
                                        </IconButton>
                                   </DialogTitle>
                                   <DialogContent dividers>
                                        {lightbox.url && (
                                             <Box component="img" src={lightbox.url} alt="preview" sx={{ width: '100%', height: 'auto', borderRadius: 1 }} />
                                        )}
                                   </DialogContent>
                              </Dialog>
                              <Dialog open={isCreateModalOpen} onClose={closeCreateModal} maxWidth="sm" fullWidth>
                                   <DialogTitle>{t('announcements.createNew')}</DialogTitle>
                                   <DialogContent dividers>
                                        <Stack spacing={2} sx={{ mt: 0.5 }}>
                                             <TextField
                                                  label={t('announcements.form.title')}
                                                  value={newAnnouncementTitle}
                                                  onChange={(event) => setNewAnnouncementTitle(event.target.value)}
                                                  disabled={isCreatingAnnouncement}
                                                  fullWidth
                                                  required
                                             />
                                             <TextField
                                                  label={t('common.lblDescription')}
                                                  value={newAnnouncementDescription}
                                                  onChange={(event) => setNewAnnouncementDescription(event.target.value)}
                                                  disabled={isCreatingAnnouncement}
                                                  multiline
                                                  minRows={4}
                                                  fullWidth
                                                  required
                                             />
                                             <TextField
                                                  select
                                                  label={t('announcements.form.category')}
                                                  value={newAnnouncementCategory}
                                                  onChange={(event) => {
                                                       setNewAnnouncementCategory(event.target.value);
                                                       setNewAnnouncementSubcategory('');
                                                  }}
                                                  disabled={isCreatingAnnouncement}
                                                  fullWidth
                                                  required
                                             >
                                                  {ANNOUNCEMENT_CATEGORIES.map(cat => {
                                                       const label = trPref(`announcements.categories.${cat.id}`, announcementCategoryLabelMap[cat.id] ?? cat.id, cat.id);
                                                       return <MenuItem key={cat.id} value={cat.id}>{label}</MenuItem>;
                                                  })}
                                             </TextField>
                                             {selectedCreateCategory && selectedCreateCategory.subcategories.length > 0 && (
                                                  <TextField
                                                       select
                                                       label={t('announcements.form.subcategory')}
                                                       value={newAnnouncementSubcategory}
                                                       onChange={(event) => setNewAnnouncementSubcategory(event.target.value)}
                                                       disabled={isCreatingAnnouncement}
                                                       fullWidth
                                                       required
                                                  >
                                                       {selectedCreateCategory.subcategories.map(sc => {
                                                            const label = trPref(`announcements.subcategories.${sc.id}`, announcementSubcategoryLabelMap[sc.id] ?? sc.id, sc.id);
                                                            return <MenuItem key={sc.id} value={sc.id}>{label}</MenuItem>;
                                                       })}
                                                  </TextField>
                                             )}
                                        </Stack>
                                   </DialogContent>
                                   <DialogActions>
                                        <Button onClick={closeCreateModal} disabled={isCreatingAnnouncement}>
                                             {t('common.btnCancel')}
                                        </Button>
                                        <Button
                                             onClick={saveNewAnnouncement}
                                             variant="contained"
                                             disabled={!canSaveNewAnnouncement || isCreatingAnnouncement}
                                             startIcon={isCreatingAnnouncement ? <CircularProgress size={16} color="inherit" /> : undefined}
                                        >
                                             {t('common.btnSave')}
                                        </Button>
                                   </DialogActions>
                              </Dialog>
                         </Box>
                    </Card>
               </Stack>
          </Container>
     );
}
