"use client";

import React, { useState } from 'react';
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
import { useFormik } from 'formik';
import { announcementInitialValues, announcementValidationSchema, AnnouncementItem, AnnouncementScope } from 'src/types/announcement';

interface AnnouncementProps {
     announcements: AnnouncementItem[];
     categories: { id: string; name: string }[];
     tenants: { id: string; name: string }[];
     apartments: { id: string; name: string }[];
     tenantGroups?: { id: string; name: string }[]; // optional for now
}

export default function Announcement({ announcements, categories, tenants, apartments, tenantGroups = [] }: AnnouncementProps) {
     // List state (would normally come from server via props & updates)
     const [rows, setRows] = useState<AnnouncementItem[]>(announcements || []);

     const formik = useFormik({
          initialValues: announcementInitialValues,
          validationSchema: announcementValidationSchema,
          onSubmit: (values) => {
               // default to draft save
               const newItem: AnnouncementItem = { id: Math.random().toString(36).slice(2), title: values.title || '(Untitled Draft)', pinned: values.pin, archived: false };
               setRows(prev => [newItem, ...prev]);
               formik.resetForm();
          }
     });

     const setFieldArray = (field: string, value: string[]) => formik.setFieldValue(field, value);

     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          if (e.target.files) {
               const files = Array.from(e.target.files);
               formik.setFieldValue('attachments', files);
          }
     };

     const handlePublish = () => {
          formik.setFieldValue('status', 'published');
          formik.handleSubmit();
     };

     const handleSaveDraft = () => {
          formik.setFieldValue('status', 'draft');
          formik.handleSubmit();
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
                                             <TextField
                                                  label="Title"
                                                  name="title"
                                                  value={formik.values.title}
                                                  onChange={formik.handleChange}
                                                  onBlur={formik.handleBlur}
                                                  error={formik.touched.title && Boolean(formik.errors.title)}
                                                  helperText={formik.touched.title && formik.errors.title}
                                                  fullWidth
                                                  required={formik.values.status === 'published'}
                                             />
                                             <QuillEditor
                                                  value={formik.values.message}
                                                  onChange={(v) => formik.setFieldValue('message', v)}
                                                  onBlur={() => formik.setFieldTouched('message', true)}
                                             />
                                             <FormControl fullWidth>
                                                  <InputLabel id="category-label">Category</InputLabel>
                                                  <Select
                                                       labelId="category-label"
                                                       name="category"
                                                       value={formik.values.category}
                                                       label="Category"
                                                       onChange={formik.handleChange}
                                                       onBlur={formik.handleBlur}
                                                       fullWidth
                                                  >
                                                       {categories.map(cat => (
                                                            <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                                                       ))}
                                                  </Select>
                                                  {formik.touched.category && formik.errors.category && (
                                                       <Typography variant="caption" color="error">{formik.errors.category}</Typography>
                                                  )}
                                             </FormControl>

                                             <FormControl component="fieldset">
                                                  <FormLabel component="legend">Visibility</FormLabel>
                                                  <RadioGroup
                                                       row
                                                       name="visibility"
                                                       value={formik.values.visibility}
                                                       onChange={(e) => formik.setFieldValue('visibility', e.target.value as AnnouncementScope)}
                                                  >
                                                       <FormControlLabel value="building" control={<Radio />} label="Building-wide" />
                                                       <FormControlLabel value="apartments" control={<Radio />} label="Specific apartments" />
                                                       <FormControlLabel value="tenants" control={<Radio />} label="Specific tenants" />
                                                       <FormControlLabel value="tenant_groups" control={<Radio />} label="Tenant groups" />
                                                  </RadioGroup>
                                             </FormControl>

                                             {formik.values.visibility === 'apartments' && (
                                                  <FormControl fullWidth>
                                                       <InputLabel id="apartments-label">Apartments</InputLabel>
                                                       <Select
                                                            labelId="apartments-label"
                                                            multiple
                                                            value={formik.values.apartments}
                                                            input={<OutlinedInput label="Apartments" />}
                                                            onChange={e => setFieldArray('apartments', e.target.value as string[])}
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

                                             {formik.values.visibility === 'tenants' && (
                                                  <FormControl fullWidth>
                                                       <InputLabel id="tenants-label">Tenants</InputLabel>
                                                       <Select
                                                            labelId="tenants-label"
                                                            multiple
                                                            value={formik.values.tenants}
                                                            input={<OutlinedInput label="Tenants" />}
                                                            onChange={e => setFieldArray('tenants', e.target.value as string[])}
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

                                             {formik.values.visibility === 'tenant_groups' && (
                                                  <FormControl fullWidth>
                                                       <InputLabel id="tenant-groups-label">Tenant groups</InputLabel>
                                                       <Select
                                                            labelId="tenant-groups-label"
                                                            multiple
                                                            value={formik.values.tenantGroups}
                                                            input={<OutlinedInput label="Tenant groups" />}
                                                            onChange={e => setFieldArray('tenantGroups', e.target.value as string[])}
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
                                                  {formik.values.attachments.length > 0 && (
                                                       <Typography variant="caption" color="text.secondary">{formik.values.attachments.length} file(s) selected</Typography>
                                                  )}
                                             </Stack>

                                             <Stack direction="row" spacing={3}>
                                                  <FormControlLabel control={<Checkbox checked={formik.values.pin} onChange={e => formik.setFieldValue('pin', e.target.checked)} />} label="Pin to top" />
                                                  <FormControlLabel control={<Checkbox checked={formik.values.scheduleEnabled} onChange={e => formik.setFieldValue('scheduleEnabled', e.target.checked)} />} label="Schedule" />
                                                  {formik.values.scheduleEnabled && (
                                                       <TextField
                                                            type="datetime-local"
                                                            label="Publish at"
                                                            value={formik.values.scheduleAt}
                                                            onChange={e => formik.setFieldValue('scheduleAt', e.target.value)}
                                                            InputLabelProps={{ shrink: true }}
                                                       />
                                                  )}
                                             </Stack>

                                             <Divider sx={{ my: 1 }} />
                                             <Stack direction="row" spacing={2} justifyContent="flex-end">
                                                  <Button variant="outlined" onClick={handleSaveDraft} disabled={!formik.values.title && !formik.values.message}>Save as draft</Button>
                                                  <Button variant="contained" onClick={handlePublish} disabled={formik.values.status === 'published' && (!!formik.errors.title || !!formik.errors.message || !!formik.errors.category)}>Publish</Button>
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
