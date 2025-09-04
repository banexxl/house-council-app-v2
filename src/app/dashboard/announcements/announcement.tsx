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
import { upsertAnnouncement, getAnnouncementById, deleteAnnouncement, togglePinAction } from 'src/app/actions/announcement/announcement-actions';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

interface AnnouncementProps {
     announcements: AnnouncementItem[];
     tenants: { id: string; name: string }[];
     apartments: { id: string; name: string }[];
     tenant_groups?: { id: string; name: string }[]; // optional for now
}

export default function Announcement({ announcements, tenants, apartments, tenant_groups = [] }: AnnouncementProps) {
     // Using server-provided announcements directly; any mutations trigger a router refresh.
     const [editingId, setEditingId] = useState<string | null>(null);
     const [rowBusy, setRowBusy] = useState<string | null>(null);
     const router = useRouter();

     const formik = useFormik({
          initialValues: announcementInitialValues,
          validationSchema: announcementValidationSchema,
          onSubmit: async (values, helpers) => {
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

               // Include id when editing so we update instead of creating a new row
               if (editingId) {
                    payload.id = editingId;
               }

               // (Attachments uploading not implemented yet) -> future enhancement

               const result = await upsertAnnouncement(payload);
               if (!result.success) {
                    helpers.setSubmitting(false);
                    toast.error('Failed to save announcement');
                    helpers.setStatus({ error: result.error });
                    return;
               }

               if (result.data) toast.success('Announcement saved successfully');

               helpers.resetForm();
               setEditingId(null);
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

     const handleEdit = async (id: string) => {
          const res = await getAnnouncementById(id);
          if (!res.success || !res.data) return;
          const a: any = res.data;
          setEditingId(id);
          formik.setValues({
               title: a.title || '',
               message: a.message || '',
               category: a.category || '',
               subcategory: a.subcategory || '',
               visibility: a.visibility || 'building',
               apartments: a.apartments || [],
               tenants: a.tenants || [],
               tenant_groups: a.tenant_groups || [],
               attachments: [],
               pin: !!a.pinned,
               schedule_enabled: !!a.schedule_at,
               scheduleAt: a.schedule_at || null,
               status: a.status || 'draft'
          });
     };

     const togglePin = async (id: string) => {
          const row = announcements.find(r => r.id === id);
          if (!row) return;
          setRowBusy(id);
          const res = await togglePinAction(id, !row.pinned);
          if (!res.success) toast.error('Failed to update announcement');
          else toast.success('Announcement updated successfully');
          router.refresh();
          setRowBusy(null);
     };

     const toggleArchive = async (id: string) => {
          const row = announcements.find(r => r.id === id);
          if (!row) return;
          setRowBusy(id);
          const res = await deleteAnnouncement(id);
          if (!res.success) {
               toast.error('Failed to delete announcement');
          } else {
               toast.success('Announcement deleted successfully');
               // If we were editing this one, reset the form
               if (editingId === id) {
                    formik.resetForm();
                    setEditingId(null);
               }
               router.refresh();
          }
          setRowBusy(null);
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
                                                       <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                            <DatePicker
                                                                 label={'Schedule at'}
                                                                 value={formik.values.scheduleAt ? dayjs(formik.values.scheduleAt) : null}
                                                                 onChange={(date) => {
                                                                      formik.setFieldValue('scheduleAt', date ? date.toISOString() : null);
                                                                 }}
                                                                 slotProps={{
                                                                      textField: {
                                                                           name: 'scheduleAt',
                                                                           error: !!(formik.touched.scheduleAt && formik.errors.scheduleAt),
                                                                           helperText: formik.touched.scheduleAt && formik.errors.scheduleAt,
                                                                      },
                                                                 }}
                                                                 disabled={!formik.values.schedule_enabled}
                                                                 disableFuture={true}
                                                            />
                                                       </LocalizationProvider>
                                                  )}
                                             </Stack>
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
                                                       Save draft
                                                  </Button>
                                                  <Button
                                                       variant="contained"
                                                       onClick={handlePublish}
                                                       disabled={
                                                            !editingId ||
                                                            (formik.values.status === 'published' && (!!formik.errors.title || !!formik.errors.message || !!formik.errors.category || !!formik.errors.subcategory))
                                                       }
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
                                                       {announcements.length === 0 && (
                                                            <TableRow>
                                                                 <TableCell colSpan={2}>
                                                                      <Typography variant="body2" color="text.secondary">No announcements yet.</Typography>
                                                                 </TableCell>
                                                            </TableRow>
                                                       )}
                                                       {announcements.map(row => (
                                                            <TableRow
                                                                 key={row.id}
                                                                 onClick={() => handleEdit(row.id)}
                                                                 hover
                                                                 sx={{ backgroundColor: editingId === row.id ? 'action.selected' : 'inherit', cursor: 'pointer' }}>
                                                                 <TableCell sx={{ maxWidth: 240 }}>
                                                                      <Stack direction="row" spacing={1} alignItems="center">
                                                                           {row.pinned && <PushPinIcon color="primary" fontSize="small" />}
                                                                           <Typography variant="body2" noWrap title={row.title}>{row.title}</Typography>
                                                                      </Stack>
                                                                 </TableCell>
                                                                 <TableCell align="right">
                                                                      <Tooltip title={editingId === row.id ? 'Editing' : 'Edit'}>
                                                                           <IconButton size="small" onClick={() => handleEdit(row.id)} color={editingId === row.id ? 'primary' : 'default'}>
                                                                                <EditIcon fontSize="small" />
                                                                           </IconButton>
                                                                      </Tooltip>
                                                                      <Tooltip title={row.pinned ? 'Unpin' : 'Pin'}>
                                                                           <IconButton size="small" onClick={() => togglePin(row.id)} disabled={rowBusy === row.id}>
                                                                                {row.pinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
                                                                           </IconButton>
                                                                      </Tooltip>
                                                                      <Tooltip title={row.archived ? 'Unarchive' : 'Archive'}>
                                                                           <IconButton size="small" onClick={() => toggleArchive(row.id)} disabled={rowBusy === row.id}>
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
