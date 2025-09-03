"use client";

import React, { useRef, useState } from 'react';
import {
     Box,
     Stack,
     Typography,
     Button,
     Grid,
     Paper,
     TextField,
     FormControl,
     FormLabel,
     RadioGroup,
     FormControlLabel,
     Radio,
     Select,
     MenuItem,
     Checkbox,
     InputLabel,
     OutlinedInput,
     Chip,
     IconButton,
     TableContainer,
     Table,
     TableHead,
     TableRow,
     TableCell,
     TableBody,
     Divider,
     Tooltip,
     Container,
     Card,
     CardHeader
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import QuillEditor from 'src/components/quill-editor';

// Placeholder props, will refine later
interface AnnouncementItem {
     id: string;
     title: string;
     pinned?: boolean;
     archived?: boolean;
}

interface AnnouncementProps {
     announcements: AnnouncementItem[];
     categories: { id: string; name: string }[];
     tenants: { id: string; name: string }[];
     apartments: { id: string; name: string }[];
     tenantGroups?: { id: string; name: string }[]; // optional for now
}

type VisibilityScope = 'building' | 'apartments' | 'tenants' | 'tenantGroups';

export default function Announcement({ announcements, categories, tenants, apartments, tenantGroups = [] }: AnnouncementProps) {
     // Form state
     const [title, setTitle] = useState('');
     const [message, setMessage] = useState('');
     const [category, setCategory] = useState('');
     const [visibility, setVisibility] = useState<VisibilityScope>('building');
     const [selectedApartments, setSelectedApartments] = useState<string[]>([]);
     const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
     const [selectedTenantGroups, setSelectedTenantGroups] = useState<string[]>([]);
     const [attachments, setAttachments] = useState<File[]>([]);
     const [pin, setPin] = useState(false);
     const [scheduleEnabled, setScheduleEnabled] = useState(false);
     const [scheduleAt, setScheduleAt] = useState<string>('');
     // List state (would normally come from server via props & updates)
     const [rows, setRows] = useState<AnnouncementItem[]>(announcements || []);

     const resetForm = () => {
          setTitle('');
          setMessage('');
          setCategory('');
          setVisibility('building');
          setSelectedApartments([]);
          setSelectedTenants([]);
          setSelectedTenantGroups([]);
          setAttachments([]);
          setPin(false);
          setScheduleEnabled(false);
          setScheduleAt('');
     };

     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          if (e.target.files) {
               setAttachments(Array.from(e.target.files));
          }
     };

     const basePayload = () => ({
          title,
          message,
          category,
          visibility,
          apartments: selectedApartments,
          tenants: selectedTenants,
          tenantGroups: selectedTenantGroups,
          attachments,
          pin,
          scheduleAt: scheduleEnabled ? scheduleAt : null,
          status: 'draft' as 'draft' | 'published'
     });

     const handlePublish = () => {
          const payload = { ...basePayload(), status: 'published' };
          // TODO: API call
          const newItem: AnnouncementItem = { id: Math.random().toString(36).slice(2), title: payload.title, pinned: pin, archived: false };
          setRows(prev => [newItem, ...prev]);
          resetForm();
     };

     const handleSaveDraft = () => {
          const payload = basePayload();
          // TODO: API call for draft
          const newItem: AnnouncementItem = { id: Math.random().toString(36).slice(2), title: payload.title || '(Untitled Draft)', pinned: pin, archived: false };
          setRows(prev => [newItem, ...prev]);
          resetForm();
     };

     const togglePin = (id: string) => {
          setRows(prev => prev.map(r => r.id === id ? { ...r, pinned: !r.pinned } : r));
     };

     const toggleArchive = (id: string) => {
          setRows(prev => prev.map(r => r.id === id ? { ...r, archived: !r.archived } : r));
     };

     const handleArchiveCurrent = () => {
          // Archive action for current (would need current editing context; placeholder)
     };

     return (
          <Container maxWidth="xl">
               <Stack spacing={4}>
                    <Typography variant="h4" sx={{ mb: 3 }}>Announcements Management</Typography>
                    <Card>
                         <Grid container>
                              {/* Form Column */}
                              <Grid size={{ xs: 12, md: 7, lg: 8 }}>
                                   <Paper variant="outlined" sx={{ p: 3, position: 'relative' }}>
                                        <Stack spacing={2}>
                                             <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} fullWidth required />
                                             <QuillEditor />
                                             <FormControl fullWidth>
                                                  <InputLabel id="category-label">Category</InputLabel>
                                                  <Select
                                                       labelId="category-label"
                                                       value={category}
                                                       label="Category"
                                                       onChange={e => setCategory(e.target.value)}
                                                       fullWidth
                                                  >
                                                       {categories.map(cat => (
                                                            <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                                                       ))}
                                                  </Select>
                                             </FormControl>

                                             <FormControl component="fieldset">
                                                  <FormLabel component="legend">Visibility</FormLabel>
                                                  <RadioGroup
                                                       row
                                                       value={visibility}
                                                       onChange={e => setVisibility(e.target.value as VisibilityScope)}
                                                  >
                                                       <FormControlLabel value="building" control={<Radio />} label="Building-wide" />
                                                       <FormControlLabel value="apartments" control={<Radio />} label="Specific apartments" />
                                                       <FormControlLabel value="tenants" control={<Radio />} label="Specific tenants" />
                                                       <FormControlLabel value="tenantGroups" control={<Radio />} label="Tenant groups" />
                                                  </RadioGroup>
                                             </FormControl>

                                             {visibility === 'apartments' && (
                                                  <FormControl fullWidth>
                                                       <InputLabel id="apartments-label">Apartments</InputLabel>
                                                       <Select
                                                            labelId="apartments-label"
                                                            multiple
                                                            value={selectedApartments}
                                                            input={<OutlinedInput label="Apartments" />}
                                                            onChange={e => setSelectedApartments(e.target.value as string[])}
                                                            renderValue={(selected) => (
                                                                 <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                      {(selected as string[]).map(value => (
                                                                           <Chip key={value} label={apartments.find(a => a.id === value)?.name || value} />
                                                                      ))}
                                                                 </Box>
                                                            )}
                                                       >
                                                            {apartments.map(ap => (
                                                                 <MenuItem key={ap.id} value={ap.id}>{ap.name}</MenuItem>
                                                            ))}
                                                       </Select>
                                                  </FormControl>
                                             )}

                                             {visibility === 'tenants' && (
                                                  <FormControl fullWidth>
                                                       <InputLabel id="tenants-label">Tenants</InputLabel>
                                                       <Select
                                                            labelId="tenants-label"
                                                            multiple
                                                            value={selectedTenants}
                                                            input={<OutlinedInput label="Tenants" />}
                                                            onChange={e => setSelectedTenants(e.target.value as string[])}
                                                            renderValue={(selected) => (
                                                                 <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                      {(selected as string[]).map(value => (
                                                                           <Chip key={value} label={tenants.find(t => t.id === value)?.name || value} />
                                                                      ))}
                                                                 </Box>
                                                            )}
                                                       >
                                                            {tenants.map(tn => (
                                                                 <MenuItem key={tn.id} value={tn.id}>{tn.name}</MenuItem>
                                                            ))}
                                                       </Select>
                                                  </FormControl>
                                             )}

                                             {visibility === 'tenantGroups' && (
                                                  <FormControl fullWidth>
                                                       <InputLabel id="tenant-groups-label">Tenant groups</InputLabel>
                                                       <Select
                                                            labelId="tenant-groups-label"
                                                            multiple
                                                            value={selectedTenantGroups}
                                                            input={<OutlinedInput label="Tenant groups" />}
                                                            onChange={e => setSelectedTenantGroups(e.target.value as string[])}
                                                            renderValue={(selected) => (
                                                                 <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                      {(selected as string[]).map(value => (
                                                                           <Chip key={value} label={tenantGroups.find(g => g.id === value)?.name || value} />
                                                                      ))}
                                                                 </Box>
                                                            )}
                                                       >
                                                            {tenantGroups.map(g => (
                                                                 <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                                                            ))}
                                                       </Select>
                                                  </FormControl>
                                             )}

                                             <Stack direction="row" spacing={2} alignItems="center">
                                                  <Button variant="outlined" component="label">
                                                       Attach files
                                                       <input type="file" hidden multiple onChange={handleFileChange} />
                                                  </Button>
                                                  {attachments.length > 0 && (
                                                       <Typography variant="caption" color="text.secondary">{attachments.length} file(s) selected</Typography>
                                                  )}
                                             </Stack>

                                             <Stack direction="row" spacing={3}>
                                                  <FormControlLabel control={<Checkbox checked={pin} onChange={e => setPin(e.target.checked)} />} label="Pin to top" />
                                                  <FormControlLabel control={<Checkbox checked={scheduleEnabled} onChange={e => setScheduleEnabled(e.target.checked)} />} label="Schedule" />
                                                  {scheduleEnabled && (
                                                       <TextField
                                                            type="datetime-local"
                                                            label="Publish at"
                                                            value={scheduleAt}
                                                            onChange={e => setScheduleAt(e.target.value)}
                                                            InputLabelProps={{ shrink: true }}
                                                       />
                                                  )}
                                             </Stack>

                                             <Divider sx={{ my: 1 }} />
                                             <Stack direction="row" spacing={2} justifyContent="flex-end">
                                                  <Button variant="outlined" onClick={handleSaveDraft} disabled={!title && !message}>Save as draft</Button>
                                                  <Button variant="contained" onClick={handlePublish} disabled={!title || !message || !category}>Publish</Button>
                                             </Stack>
                                        </Stack>
                                   </Paper>
                              </Grid>
                              {/* Table Column */}
                              <Grid size={{ xs: 12, md: 5, lg: 4 }}>
                                   <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant="h6" sx={{ mb: 2 }}>Announcements</Typography>
                                        <TableContainer sx={{ flexGrow: 1 }}>
                                             <Table size="small">
                                                  <TableHead>
                                                       <TableRow>
                                                            <TableCell>Title</TableCell>
                                                            <TableCell align="right">Actions</TableCell>
                                                       </TableRow>
                                                  </TableHead>
                                                  <TableBody>
                                                       {rows.length === 0 && (
                                                            <TableRow>
                                                                 <TableCell colSpan={2}>
                                                                      <Typography variant="body2" color="text.secondary">No announcements yet.</Typography>
                                                                 </TableCell>
                                                            </TableRow>
                                                       )}
                                                       {rows.map(row => (
                                                            <TableRow key={row.id} hover>
                                                                 <TableCell sx={{ maxWidth: 240 }}>
                                                                      <Stack direction="row" spacing={1} alignItems="center">
                                                                           {row.pinned && <PushPinIcon color="primary" fontSize="small" />}
                                                                           <Typography variant="body2" noWrap title={row.title}>{row.title}</Typography>
                                                                      </Stack>
                                                                 </TableCell>
                                                                 <TableCell align="right">
                                                                      <Tooltip title="Edit">
                                                                           <IconButton size="small"><EditIcon fontSize="small" /></IconButton>
                                                                      </Tooltip>
                                                                      <Tooltip title={row.pinned ? 'Unpin' : 'Pin'}>
                                                                           <IconButton size="small" onClick={() => togglePin(row.id)}>
                                                                                {row.pinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
                                                                           </IconButton>
                                                                      </Tooltip>
                                                                      <Tooltip title={row.archived ? 'Unarchive' : 'Archive'}>
                                                                           <IconButton size="small" onClick={() => toggleArchive(row.id)}>
                                                                                {row.archived ? <UnarchiveIcon fontSize="small" /> : <ArchiveIcon fontSize="small" />}
                                                                           </IconButton>
                                                                      </Tooltip>
                                                                 </TableCell>
                                                            </TableRow>
                                                       ))}
                                                  </TableBody>
                                             </Table>
                                        </TableContainer>
                                   </Paper>
                              </Grid>
                         </Grid>
                    </Card>
               </Stack >
          </Container>
     );
}
