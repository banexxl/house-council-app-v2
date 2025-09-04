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
import LinearProgress from '@mui/material/LinearProgress';
import EditIcon from '@mui/icons-material/Edit';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import ArchiveIcon from '@mui/icons-material/Archive';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import QuillEditor from 'src/components/quill-editor';
import { PopupModal } from 'src/components/modal-dialog';
import { useFormik } from 'formik';
import { announcementInitialValues, announcementValidationSchema, AnnouncementScope, ANNOUNCEMENT_CATEGORIES, Announcement } from 'src/types/announcement';
import { upsertAnnouncement, getAnnouncementById, deleteAnnouncement, togglePinAction, publishAnnouncement, revertToDraft, toggleArchiveAction } from 'src/app/actions/announcement/announcement-actions';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

interface AnnouncementProps {
     announcements: Announcement[];
     tenants: { id: string; name: string }[];
     apartments: { id: string; name: string }[];
     tenant_groups?: { id: string; name: string }[]; // optional for now
}

export default function Announcements({ announcements, tenants, apartments, tenant_groups = [] }: AnnouncementProps) {
     // Using server-provided announcements directly; any mutations trigger a router refresh.
     const [editingId, setEditingId] = useState<string | null>(null);
     const [rowBusy, setRowBusy] = useState<string | null>(null);
     const [imagesUploading, setImagesUploading] = useState(false);
     const [modalState, setModalState] = useState<null | { type: 'delete-announcement' | 'remove-all-images'; targetId?: string }>(null);
     const currentImages = React.useMemo(() => {
          if (!editingId) return [] as string[];
          const row = announcements.find(a => a.id === editingId);
          return row?.images || [];
     }, [editingId, announcements]);
     const formDisabled = imagesUploading; // disable interactions while images upload
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
                    pinned: values.pinned,
                    schedule_enabled: values.schedule_enabled,
                    schedule_at: values.schedule_enabled ? values.schedule_at : null,
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

     const handlePublish = async () => {
          // New announcement (no editingId): use existing submit flow to create & publish
          if (!editingId) return; // guarded by disabled state anyway
          // Existing draft -> publish via server action so published_at is set
          const res = await publishAnnouncement(editingId);
          if (!res.success) {
               toast.error('Failed to publish');
               return;
          }
          toast.success('Published');
          formik.setFieldValue('status', 'published');
          // refresh list
          router.refresh();
     };

     const handleUnpublish = async () => {
          if (!editingId) return;
          const res = await revertToDraft(editingId);
          if (!res.success) {
               toast.error('Failed to revert to draft');
               return;
          }
          toast.success('Reverted to draft');
          formik.setFieldValue('status', 'draft');
          router.refresh();
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
               id: id,
               title: a.title || '',
               message: a.message || '',
               category: a.category || '',
               subcategory: a.subcategory || '',
               visibility: a.visibility || 'building',
               apartments: a.apartments || [],
               tenants: a.tenants || [],
               tenant_groups: a.tenant_groups || [],
               attachments: [],
               pinned: !!a.pinned,
               schedule_enabled: !!a.schedule_at,
               created_at: a.created_at,
               schedule_at: a.schedule_at || null,
               status: a.status || 'draft'
          });
     };

     const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
          if (!editingId) {
               toast.error('Save draft first before uploading images');
               return;
          }
          if (!e.target.files || e.target.files.length === 0) return;
          const fileList = Array.from(e.target.files);
          try {
               setImagesUploading(true);
               const { uploadAnnouncementImages } = await import('src/app/actions/announcement/announcement-image-actions');
               const result = await uploadAnnouncementImages(fileList as any, editingId); // casting for server action transport
               if (!result.success) {
                    toast.error(result.error || 'Upload failed');
               } else if (result.urls) {
                    toast.success('Images uploaded');
               }
          } finally {
               setImagesUploading(false);
               e.target.value = '';
               router.refresh();
          }
     };

     const handleRemoveImage = async (url: string) => {
          if (!editingId) return;
          const { removeAnnouncementImage } = await import('src/app/actions/announcement/announcement-image-actions');
          const res = await removeAnnouncementImage(editingId, url);
          if (!res.success) toast.error(res.error || 'Failed to remove'); else { toast.success('Removed'); router.refresh(); }
     };

     const handleRemoveAllImages = async () => {
          if (!editingId) return;
          setModalState({ type: 'remove-all-images', targetId: editingId });
     };

     const performRemoveAllImages = async (id: string) => {
          const { removeAllAnnouncementImages } = await import('src/app/actions/announcement/announcement-image-actions');
          const res = await removeAllAnnouncementImages(id);
          if (!res.success) toast.error(res.error || 'Failed to remove images'); else { toast.success('All images removed'); router.refresh(); }
     };

     const toggleArchive = async (id: string) => {
          const row = announcements.find(r => r.id === id);
          if (!row) return;
          setRowBusy(id);
          const res = await toggleArchiveAction(id, !row.archived);
          if (!res.success) toast.error('Archive toggle failed'); else { toast.success(!row.archived ? 'Archived' : 'Unarchived'); router.refresh(); }
          setRowBusy(null);
     };

     const handleDelete = (id: string) => {
          setModalState({ type: 'delete-announcement', targetId: id });
     };

     const performDelete = async (id: string) => {
          setRowBusy(id);
          const res = await deleteAnnouncement(id);
          if (!res.success) toast.error('Delete failed'); else {
               toast.success('Deleted');
               if (editingId === id) { formik.resetForm(); setEditingId(null); }
               router.refresh();
          }
          setRowBusy(null);
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

     return (
          <Container maxWidth="xl">
               <Stack spacing={4}>
                    <Box
                         sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                         <Typography variant="h4" sx={{ mb: 3 }}>Announcements Management</Typography>
                         <Button
                              variant="contained"
                              color="primary"
                              onClick={() => {
                                   formik.resetForm();
                                   setEditingId(null);
                              }}
                         >
                              Create New Announcement
                         </Button>
                    </Box>
                    <Card>
                         <Grid container>
                              {/* Form Column */}
                              <Grid size={{ xs: 12, md: 7, lg: 8 }}>
                                   <Paper variant="outlined" sx={{ p: 3, position: 'relative' }}>
                                        {formDisabled && (
                                             <Box sx={{ position: 'absolute', inset: 0, zIndex: 10, bgcolor: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                  <Typography variant="body2" color="text.secondary">Uploading images...</Typography>
                                             </Box>
                                        )}
                                        <Box component="fieldset" disabled={formDisabled} sx={{ border: 0, p: 0, m: 0, pointerEvents: formDisabled ? 'none' : 'auto', opacity: formDisabled ? 0.6 : 1 }}>
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
                                                       disabled={formDisabled}
                                                  />
                                                  <Box sx={{ pointerEvents: formDisabled ? 'none' : 'auto', opacity: formDisabled ? 0.7 : 1 }}>
                                                       <QuillEditor
                                                            value={formik.values.message}
                                                            onChange={(v) => formik.setFieldValue('message', v)}
                                                            onBlur={() => formik.setFieldTouched('message', true)}
                                                       />
                                                  </Box>
                                                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', flexDirection: { xs: 'column', lg: 'row' } }}>
                                                       <FormControl sx={{ flex: 1, minWidth: { xs: '100%', lg: 0 } }} disabled={formDisabled}>
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
                                                                 disabled={formDisabled}
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
                                                                 <FormControl sx={{ flex: 1, minWidth: { xs: '100%', lg: 0 } }} disabled={formDisabled}>
                                                                      <InputLabel id="subcategory-label">Subcategory</InputLabel>
                                                                      <Select
                                                                           labelId="subcategory-label"
                                                                           name="subcategory"
                                                                           value={formik.values.subcategory}
                                                                           label="Subcategory"
                                                                           onChange={formik.handleChange}
                                                                           onBlur={formik.handleBlur}
                                                                           fullWidth
                                                                           disabled={formDisabled}
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
                                                  </Box>
                                                  <FormControl component="fieldset" disabled={formDisabled}>
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
                                                       <FormControl fullWidth disabled={formDisabled}>
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
                                                                 disabled={formDisabled}
                                                            >
                                                                 {apartments.map(ap => (
                                                                      <MenuItem key={ap.id} value={ap.id}>{ap.name}</MenuItem>
                                                                 ))}
                                                            </Select>
                                                       </FormControl>
                                                  )}

                                                  {formik.values.visibility === 'tenants' && (
                                                       <FormControl fullWidth disabled={formDisabled}>
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
                                                                 disabled={formDisabled}
                                                            >
                                                                 {tenants.map(tn => (
                                                                      <MenuItem key={tn.id} value={tn.id}>{tn.name}</MenuItem>
                                                                 ))}
                                                            </Select>
                                                       </FormControl>
                                                  )}

                                                  {formik.values.visibility === 'tenant_groups' && (
                                                       <FormControl fullWidth disabled={formDisabled}>
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
                                                                 disabled={formDisabled}
                                                            >
                                                                 {tenant_groups.map(g => (
                                                                      <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                                                                 ))}
                                                            </Select>
                                                       </FormControl>
                                                  )}

                                                  {/* Images Section */}
                                                  <Divider sx={{ my: 1 }} />
                                                  <Stack spacing={1}>
                                                       <Stack direction="row" alignItems="center" spacing={2}>
                                                            <Button variant="outlined" component="label" disabled={!editingId || imagesUploading}>
                                                                 {imagesUploading ? 'Uploading...' : 'Upload images'}
                                                                 <input type="file" hidden multiple accept="image/*" onChange={handleImagesUpload} />
                                                            </Button>
                                                            <Button color="error" disabled={!editingId || currentImages.length === 0 || formDisabled} onClick={handleRemoveAllImages}>Remove all</Button>
                                                            <Typography variant="caption" color="text.secondary">{currentImages.length} image(s)</Typography>
                                                       </Stack>
                                                       {currentImages.length > 0 && (
                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                                 {currentImages.map(url => (
                                                                      <Box key={url} sx={{ position: 'relative', width: 80, height: 80, borderRadius: 1, overflow: 'hidden', border: theme => `1px solid ${theme.palette.divider}` }}>
                                                                           {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                           <img src={url} alt="ann-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                           <button type="button" onClick={() => handleRemoveImage(url)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10, padding: '2px 4px' }}>x</button>
                                                                      </Box>
                                                                 ))}
                                                            </Box>
                                                       )}
                                                       {imagesUploading && <LinearProgress sx={{ mt: 1 }} />}
                                                  </Stack>
                                                  <Divider sx={{ my: 1 }} />
                                                  <Stack direction="row" spacing={3} height={40} alignItems="center" sx={{ opacity: formDisabled ? 0.6 : 1 }}>
                                                       <FormControlLabel disabled={formDisabled} control={<Checkbox checked={formik.values.pinned} onChange={e => formik.setFieldValue('pinned', e.target.checked)} />} label="Pin to top" />
                                                       <FormControlLabel disabled={formDisabled} control={<Checkbox checked={formik.values.schedule_enabled} onChange={e => formik.setFieldValue('schedule_enabled', e.target.checked)} />} label="Schedule" />
                                                       {formik.values.schedule_enabled && (
                                                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                                 <DatePicker
                                                                      label={'Schedule at'}
                                                                      value={formik.values.schedule_at ? dayjs(formik.values.schedule_at) : null}
                                                                      onChange={(date) => {
                                                                           formik.setFieldValue('schedule_at', date ? date.toISOString() : null);
                                                                      }}
                                                                      slotProps={{
                                                                           textField: {
                                                                                name: 'schedule_at',
                                                                                error: !!(formik.touched.schedule_at && formik.errors.schedule_at),
                                                                                helperText: formik.touched.schedule_at && formik.errors.schedule_at,
                                                                           },
                                                                      }}
                                                                      disabled={!formik.values.schedule_enabled || formDisabled}
                                                                      disablePast={true}
                                                                 />
                                                            </LocalizationProvider>
                                                       )}
                                                  </Stack>
                                                  <Divider sx={{ my: 1 }} />
                                                  <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ opacity: formDisabled ? 0.6 : 1 }}>
                                                       <Button
                                                            variant="outlined"
                                                            onClick={handleSaveDraft}
                                                            disabled={
                                                                 formDisabled ||
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
                                                       {formik.values.status === 'published' ? (
                                                            <Button
                                                                 variant="contained"
                                                                 color="warning"
                                                                 onClick={handleUnpublish}
                                                                 disabled={formDisabled || !editingId || rowBusy === editingId}
                                                            >
                                                                 Unpublish
                                                            </Button>
                                                       ) : (
                                                            <Button
                                                                 variant="contained"
                                                                 onClick={handlePublish}
                                                                 disabled={formDisabled || !editingId || !!formik.errors.title || !!formik.errors.message || !!formik.errors.category || !!formik.errors.subcategory}
                                                                 loading={formik.isSubmitting && formik.values.status !== 'draft'}>
                                                                 Publish
                                                            </Button>
                                                       )}
                                                  </Stack>

                                             </Stack>
                                        </Box>
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
                                                                      <Tooltip title={row.pinned ? 'Unpin' : 'Pin'}>
                                                                           <IconButton size="small" onClick={() => togglePin(row.id)} disabled={rowBusy === row.id}>
                                                                                {row.pinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
                                                                           </IconButton>
                                                                      </Tooltip>
                                                                      <Tooltip title={row.archived ? 'Unarchive' : 'Archive'}>
                                                                           <IconButton size="small" onClick={() => toggleArchive(row.id)} disabled={rowBusy === row.id}>
                                                                                {row.archived ? <ArchiveIcon fontSize="small" /> : <ArchiveOutlinedIcon fontSize="small" />}
                                                                           </IconButton>
                                                                      </Tooltip>
                                                                      <Tooltip title="Delete">
                                                                           <IconButton size="small" color="error" onClick={() => handleDelete(row.id)} disabled={rowBusy === row.id}>
                                                                                <DeleteIcon fontSize="small" />
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
               {/* Confirmation Modals */}
               {
                    modalState?.type === 'delete-announcement' && (
                         <PopupModal
                              isOpen
                              onClose={() => setModalState(null)}
                              onConfirm={async () => {
                                   if (modalState.targetId) await performDelete(modalState.targetId);
                                   setModalState(null);
                              }}
                              title="Delete announcement"
                              type="confirmation"
                              confirmText="Delete"
                              cancelText="Cancel"
                         >
                              Are you sure you want to permanently delete this announcement? This action cannot be undone.
                         </PopupModal>
                    )
               }
               {
                    modalState?.type === 'remove-all-images' && (
                         <PopupModal
                              isOpen
                              onClose={() => setModalState(null)}
                              onConfirm={async () => {
                                   if (modalState.targetId) await performRemoveAllImages(modalState.targetId);
                                   setModalState(null);
                              }}
                              title="Remove all images"
                              type="confirmation"
                              confirmText="Remove"
                              cancelText="Cancel"
                         >
                              Remove all images for this announcement? This cannot be undone.
                         </PopupModal>
                    )
               }
          </Container>

     );
}
