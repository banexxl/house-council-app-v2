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
import { announcementInitialValues, announcementValidationSchema, AnnouncementItem, AnnouncementScope, ANNOUNCEMENT_CATEGORIES } from 'src/types/announcement';
import { upsertAnnouncement } from 'src/app/actions/announcement/announcement-actions';

interface AnnouncementProps {
     announcements: AnnouncementItem[];
     tenants: { id: string; name: string }[];
     apartments: { id: string; name: string }[];
     tenant_groups?: { id: string; name: string }[]; // optional for now
}

export default function Announcement({ announcements, tenants, apartments, tenant_groups = [] }: AnnouncementProps) {
     // List state (would normally come from server via props & updates)
     const [rows, setRows] = useState<AnnouncementItem[]>(announcements || []);

     const formik = useFormik({
          initialValues: announcementInitialValues,
          validationSchema: announcementValidationSchema,
          onSubmit: async (values, helpers) => {
               console.log('values:', values);

               helpers.setSubmitting(true);
               // Build payload mapping to server expectations
               const payload: any = {
                    title: values.title.trim(),
                    message: values.message,
                    category: values.category || null,
                    subcategory: values.subcategory || null,
                    visibility: values.visibility,
                    apartments: values.apartments,
                    tenants: values.tenants,
                    tenant_groups: values.tenant_groups,
                    pin: values.pin,
                    schedule_enabled: values.schedule_enabled,
                    scheduleAt: values.schedule_enabled ? values.scheduleAt : null,
                    status: values.status,
               };

               // (Attachments uploading not implemented yet) -> future enhancement

               const result = await upsertAnnouncement(payload);
               if (!result.success) {
                    helpers.setSubmitting(false);
                    helpers.setStatus({ error: result.error });
                    return;
               }

               // Optimistically add to list (prepend). We only keep subset of fields for list display
               if (result.data) {
                    setRows(prev => [{ id: result.data.id!, title: result.data.title, pinned: result.data.pinned, archived: result.data.archived }, ...prev]);
               }

               helpers.resetForm();
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
                                                       onChange={(e) => {
                                                            const val = e.target.value;
                                                            formik.setFieldValue('category', val);
                                                            // reset subcategory when category changes
                                                            formik.setFieldValue('subcategory', '');
                                                       }}
                                                       onBlur={formik.handleBlur}
                                                       fullWidth
                                                  >
                                                       {ANNOUNCEMENT_CATEGORIES.map(cat => (
                                                            <MenuItem key={cat.id} value={cat.id}>{cat.label}</MenuItem>
                                                       ))}
                                                  </Select>
                                                  {formik.touched.category && formik.errors.category && (
                                                       <Typography variant="caption" color="error">{formik.errors.category}</Typography>
                                                  )}
                                             </FormControl>

                                             {(() => {
                                                  const cat = ANNOUNCEMENT_CATEGORIES.find(c => c.id === formik.values.category);
                                                  if (!cat || cat.subcategories.length === 0) return null;
                                                  return (
                                                       <FormControl fullWidth>
                                                            <InputLabel id="subcategory-label">Subcategory</InputLabel>
                                                            <Select
                                                                 labelId="subcategory-label"
                                                                 name="subcategory"
                                                                 value={formik.values.subcategory}
                                                                 label="Subcategory"
                                                                 onChange={formik.handleChange}
                                                                 onBlur={formik.handleBlur}
                                                                 fullWidth
                                                            >
                                                                 {cat.subcategories.map(sc => (
                                                                      <MenuItem key={sc.id} value={sc.id}>{sc.label}</MenuItem>
                                                                 ))}
                                                            </Select>
                                                            {formik.touched.subcategory && formik.errors.subcategory && (
                                                                 <Typography variant="caption" color="error">{formik.errors.subcategory as string}</Typography>
                                                            )}
                                                       </FormControl>
                                                  );
                                             })()}

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
                                                            value={formik.values.tenant_groups}
                                                            input={<OutlinedInput label="Tenant groups" />}
                                                            onChange={e => setFieldArray('tenant_groups', e.target.value as string[])}
                                                            renderValue={(selected) => (
                                                                 <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                      {(selected as string[]).map(value => (
                                                                           <Chip key={value} label={tenant_groups.find(g => g.id === value)?.name || value} />
                                                                      ))}
                                                                 </Box>
                                                            )}
                                                       >
                                                            {tenant_groups.map(g => (
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

                                             <Stack direction="row" spacing={3} height={40} alignItems="center">
                                                  <FormControlLabel control={<Checkbox checked={formik.values.pin} onChange={e => formik.setFieldValue('pin', e.target.checked)} />} label="Pin to top" />
                                                  <FormControlLabel control={<Checkbox checked={formik.values.schedule_enabled} onChange={e => formik.setFieldValue('schedule_enabled', e.target.checked)} />} label="Schedule" />
                                                  {formik.values.schedule_enabled && (
                                                       <TextField
                                                            type="datetime-local"
                                                            label="Publish at"
                                                            value={formik.values.scheduleAt}
                                                            onChange={e => formik.setFieldValue('scheduleAt', e.target.value)}
                                                            InputLabelProps={{ shrink: true }}
                                                       />
                                                  )}
                                             </Stack>
                                             <Typography>
                                                  {JSON.stringify(formik.errors)}
                                             </Typography>
                                             <Divider sx={{ my: 1 }} />
                                             <Stack direction="row" spacing={2} justifyContent="flex-end">
                                                  <Button
                                                       variant="outlined"
                                                       onClick={handleSaveDraft}
                                                       disabled={
                                                            !formik.values.title.trim() ||
                                                            !formik.values.message.trim() ||
                                                            !formik.values.category ||
                                                            (!!ANNOUNCEMENT_CATEGORIES.find(c => c.id === formik.values.category && c.subcategories.length > 0) && !formik.values.subcategory) ||
                                                            Object.keys(formik.errors).length > 0
                                                       }
                                                       loading={formik.isSubmitting && formik.values.status === 'draft'}
                                                  >
                                                       Save as draft
                                                  </Button>
                                                  <Button
                                                       variant="contained"
                                                       onClick={handlePublish}
                                                       disabled={formik.values.status === 'published' && (!!formik.errors.title || !!formik.errors.message || !!formik.errors.category || !!formik.errors.subcategory)}
                                                       loading={formik.isSubmitting && formik.values.status === 'published'}
                                                  >
                                                       Publish
                                                  </Button>
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
