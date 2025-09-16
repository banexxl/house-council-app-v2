"use client";

import { useState, useMemo, useCallback } from 'react';
import { Announcement } from 'src/types/announcement';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
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
import Skeleton from '@mui/material/Skeleton';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import PushPinIcon from '@mui/icons-material/PushPin';
import ScheduleIcon from '@mui/icons-material/Schedule';

interface Props {
     announcements: Announcement[];
     buildings?: Record<string, any>;
}

export default function TenantAnnouncementsViewer({ announcements, buildings = {} }: Props) {
     const [selectedId, setSelectedId] = useState<string | null>(announcements[0]?.id || null);
     const [search, setSearch] = useState('');
     const [category, setCategory] = useState<string>('');
     const [buildingFilter, setBuildingFilter] = useState<string>('');
     const [showPinnedOnly, setShowPinnedOnly] = useState(false);
     const [lightbox, setLightbox] = useState<{ open: boolean; url?: string }>({ open: false });

     const categories = useMemo(() => Array.from(new Set(announcements.map(a => a.category).filter(Boolean))) as string[], [announcements]);
     const buildingOptions = useMemo(() => {
          const set = new Set<string>();
          announcements.forEach(a => (a.buildings || []).forEach(b => set.add(b)));
          return Array.from(set.values());
     }, [announcements]);

     const filtered = useMemo(() => {
          const searchLower = search.trim().toLowerCase();
          return announcements.filter(a => {
               if (showPinnedOnly && !a.pinned) return false;
               if (category && a.category !== category) return false;
               if (buildingFilter && !(a.buildings || []).includes(buildingFilter)) return false;
               if (!searchLower) return true;
               return (
                    (a.title || '').toLowerCase().includes(searchLower) ||
                    (a.message || '').toLowerCase().includes(searchLower)
               );
          });
     }, [announcements, search, category, buildingFilter, showPinnedOnly]);

     const selected = useMemo(
          () => filtered.find(a => a.id === selectedId) || filtered[0] || null,
          [filtered, selectedId]
     );

     // Keep selection valid when filter changes
     useMemo(() => {
          if (selected && filtered.some(a => a.id === selected.id)) return;
          if (filtered.length) setSelectedId(filtered[0].id!);
          else setSelectedId(null);
     }, [filtered, selected]);

     const clearFilters = useCallback(() => {
          setSearch('');
          setCategory('');
          setBuildingFilter('');
          setShowPinnedOnly(false);
     }, []);

     const openLightbox = useCallback((url: string) => setLightbox({ open: true, url }), []);
     const closeLightbox = useCallback(() => setLightbox({ open: false }), []);

     return (
          <Container maxWidth="xl">
               <Stack spacing={3}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <Typography variant="h4">Tenant Announcements</Typography>
                    </Box>
                    <Card sx={{ p: 2 }}>
                         <Box display="flex" gap={2} sx={{ width: '100%', alignItems: 'stretch' }}>
                              {/* Left Pane */}
                              <Paper variant="outlined" sx={{ width: 360, display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>
                                   <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                             <TextField
                                                  size="small"
                                                  fullWidth
                                                  placeholder="Search announcements..."
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
                                             {(search || category || buildingFilter || showPinnedOnly) && (
                                                  <Tooltip title="Clear filters">
                                                       <IconButton size="small" onClick={clearFilters}>
                                                            <FilterAltOffIcon fontSize="small" />
                                                       </IconButton>
                                                  </Tooltip>
                                             )}
                                        </Stack>
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                             <TextField
                                                  select
                                                  label="Category"
                                                  size="small"
                                                  value={category}
                                                  onChange={e => setCategory(e.target.value)}
                                                  sx={{ minWidth: 120 }}
                                             >
                                                  <MenuItem value="">All</MenuItem>
                                                  {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                             </TextField>
                                             <TextField
                                                  select
                                                  label="Building"
                                                  size="small"
                                                  value={buildingFilter}
                                                  onChange={e => setBuildingFilter(e.target.value)}
                                                  sx={{ minWidth: 140 }}
                                             >
                                                  <MenuItem value="">All</MenuItem>
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
                                             <Chip
                                                  size="small"
                                                  color={showPinnedOnly ? 'warning' : 'default'}
                                                  variant={showPinnedOnly ? 'filled' : 'outlined'}
                                                  icon={<PushPinIcon fontSize="small" />}
                                                  label={showPinnedOnly ? 'Pinned Only' : 'All'}
                                                  onClick={() => setShowPinnedOnly(p => !p)}
                                             />
                                        </Stack>
                                   </Box>
                                   <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                                        <List disablePadding>
                                             {filtered.map((a: Announcement) => {
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
                                                                           <Typography variant="subtitle2" noWrap sx={{ flexGrow: 1 }}>{a.title || 'Untitled'}</Typography>
                                                                           {a.pinned && <Tooltip title="Pinned"><PushPinIcon color="warning" fontSize="small" /></Tooltip>}
                                                                           {a.schedule_enabled && a.schedule_at && (
                                                                                <Tooltip title={`Scheduled: ${new Date(a.schedule_at).toLocaleString()}`}>
                                                                                     <ScheduleIcon color="info" fontSize="small" />
                                                                                </Tooltip>
                                                                           )}
                                                                           {imagesCount > 0 && (
                                                                                <Tooltip title={`${imagesCount} image${imagesCount === 1 ? '' : 's'}`}>
                                                                                     <Badge badgeContent={imagesCount} color="primary" max={9}>
                                                                                          <ImageIcon fontSize="small" />
                                                                                     </Badge>
                                                                                </Tooltip>
                                                                           )}
                                                                           {docsCount > 0 && (
                                                                                <Tooltip title={`${docsCount} document${docsCount === 1 ? '' : 's'}`}>
                                                                                     <Badge badgeContent={docsCount} color="secondary" max={9}>
                                                                                          <DescriptionIcon fontSize="small" />
                                                                                     </Badge>
                                                                                </Tooltip>
                                                                           )}
                                                                      </Stack>
                                                                 }
                                                                 secondary={
                                                                      <Typography variant="caption" color="text.secondary" noWrap>
                                                                           {new Date(a.created_at).toLocaleString()} · {(a.buildings || []).length} bldgs
                                                                      </Typography>
                                                                 }
                                                            />
                                                       </ListItemButton>
                                                  );
                                             })}
                                             {filtered.length === 0 && (
                                                  <Box sx={{ p: 3, textAlign: 'center' }}>
                                                       <Typography variant="body2" color="text.secondary">No announcements match your filters.</Typography>
                                                  </Box>
                                             )}
                                        </List>
                                   </Box>
                                   <Divider />
                                   <Box sx={{ p: 1, textAlign: 'right' }}>
                                        <Typography variant="caption" color="text.secondary">{filtered.length} / {announcements.length} shown</Typography>
                                   </Box>
                              </Paper>

                              {/* Right Pane */}
                              <Paper variant="outlined" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>
                                   {!selected && (
                                        <Box sx={{ p: 4, textAlign: 'center' }}>
                                             <Typography variant="body2" color="text.secondary">Select an announcement.</Typography>
                                        </Box>
                                   )}
                                   {selected && (
                                        <>
                                             <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                  <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
                                                       <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                                                            <Typography variant="h5" sx={{ mb: 1, pr: 1 }} noWrap>{selected.title}</Typography>
                                                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                                 {selected.pinned && <Chip size="small" color="warning" label="Pinned" />}
                                                                 <Chip size="small" label={selected.status === 'published' ? 'Published' : 'Draft'} color={selected.status === 'published' ? 'success' : 'default'} />
                                                                 {selected.category && <Chip size="small" label={selected.category} variant="outlined" />}
                                                                 {selected.subcategory && <Chip size="small" label={selected.subcategory} variant="outlined" />}
                                                                 {selected.schedule_enabled && selected.schedule_at && <Chip size="small" color="info" label={`Scheduled ${new Date(selected.schedule_at).toLocaleString()}`} />}
                                                                 {(selected.images?.length || 0) > 0 && (
                                                                      <Chip
                                                                           size="small"
                                                                           variant="outlined"
                                                                           icon={<ImageIcon fontSize="small" />}
                                                                           label={`${selected.images?.length ?? 0} image${(selected.images?.length ?? 0) === 1 ? '' : 's'}`}
                                                                      />
                                                                 )}
                                                                 {Array.isArray(selected.documents) && selected.documents.length > 0 && (
                                                                      <Chip
                                                                           size="small"
                                                                           variant="outlined"
                                                                           icon={<DescriptionIcon fontSize="small" />}
                                                                           label={`${selected.documents.length} doc${selected.documents.length === 1 ? '' : 's'}`}
                                                                      />
                                                                 )}
                                                            </Stack>
                                                       </Box>
                                                       <Stack spacing={0.5} sx={{ textAlign: 'right' }}>
                                                            <Typography variant="caption" color="text.secondary">Created {new Date(selected.created_at).toLocaleString()}</Typography>
                                                            {selected.updated_at && (
                                                                 <Typography variant="caption" color="text.secondary">Updated {new Date(selected.updated_at).toLocaleString()}</Typography>
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
                                                       <Typography variant="body1" sx={{ mb: 4, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{selected.message}</Typography>
                                                  )}
                                                  {Array.isArray(selected.images) && selected.images.length > 0 && (
                                                       <Box sx={{ mb: 4 }}>
                                                            <Typography variant="subtitle1" gutterBottom>Images</Typography>
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
                                                            <Typography variant="subtitle1" gutterBottom>Documents</Typography>
                                                            <List dense>
                                                                 {selected.documents.map((d: any, i: number) => (
                                                                      <ListItemButton key={i} component="a" href={d.url} target="_blank" rel="noopener noreferrer" sx={{ borderRadius: 1 }}>
                                                                           <ListItemText
                                                                                primary={<Typography variant="body2">{d.name || `Document ${i + 1}`}</Typography>}
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
                                        Image Preview
                                        <IconButton aria-label="close" onClick={closeLightbox} sx={{ position: 'absolute', right: 8, top: 8 }}>
                                             <CloseIcon />
                                        </IconButton>
                                   </DialogTitle>
                                   <DialogContent dividers>
                                        {lightbox.url && (
                                             <Box component="img" src={lightbox.url} alt="preview" sx={{ width: '100%', height: 'auto', borderRadius: 1 }} />
                                        )}
                                   </DialogContent>
                              </Dialog>
                         </Box>
                    </Card>
               </Stack>
          </Container>
     );
}
