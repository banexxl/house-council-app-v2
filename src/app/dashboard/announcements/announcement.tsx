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
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { Client } from 'src/types/client';
import { Building } from 'src/types/building';
import { Tenant } from 'src/types/tenant';
import { Apartment } from 'src/types/apartment';

interface AnnouncementProps {
     announcements: Announcement[];
     client: Client
     buildings: Building[]
}

export default function Announcements({ client, announcements, buildings }: AnnouncementProps) {

     // Using server-provided announcements directly; any mutations trigger a router refresh.
     const [editingEntity, setEditingEntity] = useState<Announcement | null>(null);
     const [apartments, setApartments] = useState<Apartment[]>([]);
     const [tenants, setTenants] = useState<Tenant[]>([]);
     const [rowBusy, setRowBusy] = useState<string | null>(null);
     const [imagesUploading, setImagesUploading] = useState(false);
     const [docsUploading, setDocsUploading] = useState(false);
     const [modalState, setModalState] = useState<null | { type: 'delete-announcement' | 'remove-all-images' | 'remove-all-documents'; targetId?: string }>(null);
     const currentImages = React.useMemo(() => {
          if (!editingEntity) return [] as string[];
          const row = announcements.find(a => a.id === editingEntity.id);
          return row?.images || [];
     }, [editingEntity, announcements]);
     const currentDocuments = React.useMemo(() => {
          if (!editingEntity) return [] as { url: string; name: string; mime?: string }[];
          const row: any = announcements.find(a => a.id === editingEntity.id);
          return row?.documents || [];
     }, [editingEntity, announcements]);

     const formDisabled = imagesUploading || docsUploading; // disable interactions while uploads
     const router = useRouter();


     const { t } = useTranslation();

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
                    pinned: values.pinned,
                    schedule_enabled: values.schedule_enabled,
                    schedule_at: values.schedule_enabled ? values.schedule_at : null,
                    status: values.status,
               };

               // Include id when editing so we update instead of creating a new row
               if (editingEntity) {
                    payload.id = editingEntity.id;
               }

               // (Attachments uploading not implemented yet) -> future enhancement

               const result = await upsertAnnouncement(payload);
               if (!result.success) {
                    helpers.setSubmitting(false);
                    toast.error(t(tokens.announcements.toasts.saveError));
                    helpers.setStatus({ error: result.error });
                    return;
               }

               if (result.data) toast.success(t(tokens.announcements.toasts.saveSuccess));

               helpers.resetForm();
               setEditingEntity(null);
          }
     });

     const setFieldArray = (field: string, value: string[]) => formik.setFieldValue(field, value);

     const handlePublish = async () => {
          // New announcement (no editingEntity): use existing submit flow to create & publish
          if (!editingEntity) return; // guarded by disabled state anyway
          // Existing draft -> publish via server action so published_at is set
          const res = await publishAnnouncement(editingEntity.id);
          if (!res.success) {
               toast.error(t(tokens.announcements.toasts.publishError));
               return;
          }
          toast.success(t(tokens.announcements.toasts.publishSuccess));
          formik.setFieldValue('status', 'published');
          // refresh list
          router.refresh();
     };

     const handleUnpublish = async () => {
          if (!editingEntity) return;
          const res = await revertToDraft(editingEntity.id);
          if (!res.success) {
               toast.error(t(tokens.announcements.toasts.unpublishError));
               return;
          }
          toast.success(t(tokens.announcements.toasts.unpublishSuccess));
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
          setEditingEntity(a);
          formik.setValues({
               id: id,
               title: a.title || '',
               message: a.message || '',
               category: a.category || '',
               subcategory: a.subcategory || '',
               visibility: a.visibility || 'building',
               apartments: a.apartments || [],
               tenants: a.tenants || [],
               attachments: [],
               pinned: !!a.pinned,
               schedule_enabled: !!a.schedule_at,
               created_at: a.created_at,
               schedule_at: a.schedule_at || null,
               status: a.status || 'draft',
               user_id: a.user_id
          });
     };

     const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
          if (!editingEntity) {
               toast.error(t(tokens.announcements.toasts.saveDraftBeforeImages));
               return;
          }
          if (!e.target.files || e.target.files.length === 0) return;
          const fileList = Array.from(e.target.files);
          try {
               setImagesUploading(true);
               const { uploadAnnouncementImages } = await import('src/app/actions/announcement/announcement-image-actions');
               const result = await uploadAnnouncementImages(fileList as any, editingEntity.id, client.name, editingEntity.title); // casting for server action transport
               if (!result.success) {
                    toast.error(result.error || t(tokens.announcements.toasts.uploadFailed));
               } else if (result.urls) {
                    toast.success(t(tokens.announcements.toasts.imagesUploaded));
               }
          } finally {
               setImagesUploading(false);
               e.target.value = '';
               router.refresh();
          }
     };

     const handleRemoveImage = async (url: string) => {
          if (!editingEntity) return;
          const { removeAnnouncementImage } = await import('src/app/actions/announcement/announcement-image-actions');
          const res = await removeAnnouncementImage(editingEntity.id, url);
          if (!res.success) toast.error(res.error || t(tokens.announcements.toasts.removeImageFailed)); else { toast.success(t(tokens.announcements.toasts.removeImageSuccess)); router.refresh(); }
     };

     const handleRemoveAllImages = async () => {
          if (!editingEntity) return;
          setModalState({ type: 'remove-all-images', targetId: editingEntity.id });
     };

     const handleDocumentsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
          if (!editingEntity) {
               toast.error(t(tokens.announcements.toasts.saveDraftBeforeImages));
               return;
          }
          if (!e.target.files || e.target.files.length === 0) return;
          const fileList = Array.from(e.target.files);
          try {
               setDocsUploading(true);
               const { uploadAnnouncementDocuments } = await import('src/app/actions/announcement/announcement-document-actions');
               const result = await uploadAnnouncementDocuments(fileList as any, editingEntity.id, client.name, editingEntity.title); // casting for server action transport
               if (!result.success) {
                    toast.error(result.error || t(tokens.announcements.toasts.uploadFailed));
               } else if (result.urls) {
                    toast.success(t(tokens.announcements.toasts.documentsUploaded || tokens.announcements.toasts.imagesUploaded));
               }
          } finally {
               setDocsUploading(false);
               e.target.value = '';
               router.refresh();
          }
     };

     const handleRemoveDocument = async (url: string) => {
          if (!editingEntity) return;
          const { removeAnnouncementDocument } = await import('src/app/actions/announcement/announcement-document-actions');
          const res = await removeAnnouncementDocument(editingEntity.id, url);
          if (!res.success) toast.error(res.error || t(tokens.announcements.toasts.removeImageFailed)); else { toast.success(t(tokens.announcements.toasts.removeImageSuccess)); router.refresh(); }
     };

     const handleRemoveAllDocuments = async () => {
          if (!editingEntity) return;
          setModalState({ type: 'remove-all-documents', targetId: editingEntity.id });
     };

     const performRemoveAllDocuments = async (id: string) => {
          const { removeAllAnnouncementDocuments } = await import('src/app/actions/announcement/announcement-document-actions');
          const res = await removeAllAnnouncementDocuments(id);
          if (!res.success) toast.error(res.error || t(tokens.announcements.toasts.removeImagesFailed)); else { toast.success(t(tokens.announcements.toasts.removeImagesSuccess)); router.refresh(); }
     };

     const performRemoveAllImages = async (id: string) => {
          const { removeAllAnnouncementImages } = await import('src/app/actions/announcement/announcement-image-actions');
          const res = await removeAllAnnouncementImages(id);
          if (!res.success) toast.error(res.error || t(tokens.announcements.toasts.removeImagesFailed)); else { toast.success(t(tokens.announcements.toasts.removeImagesSuccess)); router.refresh(); }
     };

     const toggleArchive = async (id: string) => {
          const row = announcements.find(r => r.id === id);
          if (!row) return;
          setRowBusy(id);
          const res = await toggleArchiveAction(id, !row.archived);
          if (!res.success) toast.error(t(tokens.announcements.toasts.archiveToggleFailed)); else { toast.success(!row.archived ? t(tokens.announcements.toasts.archived) : t(tokens.announcements.toasts.unarchived)); router.refresh(); }
          setRowBusy(null);
     };

     const handleDelete = (id: string) => {
          setModalState({ type: 'delete-announcement', targetId: id });
     };

     const performDelete = async (id: string) => {
          setRowBusy(id);
          const res = await deleteAnnouncement(id);
          if (!res.success) toast.error(t(tokens.announcements.toasts.deleteFailed)); else {
               toast.success(t(tokens.announcements.toasts.deleted));
               if (editingEntity!.id === id!) { formik.resetForm(); setEditingEntity(null); }
          }
          setRowBusy(null);
     };

     const togglePin = async (id: string) => {
          const row = announcements.find(r => r.id === id);
          if (!row) return;
          setRowBusy(id);
          const res = await togglePinAction(id, !row.pinned);
          if (!res.success) toast.error(t(tokens.announcements.toasts.updateFailed));
          else toast.success(t(tokens.announcements.toasts.updateSuccess));
          router.refresh();
          setRowBusy(null);
     };


     return (
          <Container maxWidth="xl">
               <Stack spacing={4}>
                    <Box
                         sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                         <Typography variant="h4" sx={{ mb: 3 }}>{t(tokens.announcements.managementTitle)}</Typography>
                         <Button
                              variant="contained"
                              color="primary"
                              onClick={() => {
                                   formik.resetForm();
                                   setEditingEntity(null);
                              }}
                         >
                              {t(tokens.announcements.createNew)}
                         </Button>
                    </Box>
                    <Card>
                         <Grid container>
                              {/* Form Column */}
                              <Grid size={{ xs: 12, md: 7, lg: 8 }}>
                                   <Paper variant="outlined" sx={{ p: 3, position: 'relative' }}>
                                        {formDisabled && (
                                             <Box sx={{ position: 'absolute', inset: 0, zIndex: 10, bgcolor: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                  <Typography variant="body2" color="text.secondary">{t(tokens.announcements.uploadingImages)}</Typography>
                                             </Box>
                                        )}
                                        <Box component="fieldset" disabled={formDisabled} sx={{ border: 0, p: 0, m: 0, pointerEvents: formDisabled ? 'none' : 'auto', opacity: formDisabled ? 0.6 : 1 }}>
                                             <Stack spacing={2}>
                                                  <TextField
                                                       label={t(tokens.announcements.form.title)}
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
                                                            <InputLabel id="category-label">{t(tokens.announcements.form.category)}</InputLabel>
                                                            <Select
                                                                 labelId="category-label"
                                                                 name="category"
                                                                 value={formik.values.category}
                                                                 label={t(tokens.announcements.form.category)}
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
                                                                      <MenuItem key={cat.id} value={cat.id}>{t(tokens.announcements.categories[cat.id as keyof typeof tokens.announcements.categories])}</MenuItem>
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
                                                                      <InputLabel id="subcategory-label">{t(tokens.announcements.form.subcategory)}</InputLabel>
                                                                      <Select
                                                                           labelId="subcategory-label"
                                                                           name="subcategory"
                                                                           value={formik.values.subcategory}
                                                                           label={t(tokens.announcements.form.subcategory)}
                                                                           onChange={formik.handleChange}
                                                                           onBlur={formik.handleBlur}
                                                                           fullWidth
                                                                           disabled={formDisabled}
                                                                      >
                                                                           {cat.subcategories.map(sc => (
                                                                                <MenuItem key={sc.id} value={sc.id}>{t(tokens.announcements.subcategories[sc.id as keyof typeof tokens.announcements.subcategories])}</MenuItem>
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
                                                       <FormLabel component="legend">{t(tokens.announcements.form.visibility)}</FormLabel>
                                                       <RadioGroup
                                                            row
                                                            name="visibility"
                                                            value={formik.values.visibility}
                                                            onChange={(e) => formik.setFieldValue('visibility', e.target.value as AnnouncementScope)}
                                                       >
                                                            <FormControlLabel value="building" control={<Radio />} label={t(tokens.announcements.visibilityValues.buildingWide)} />
                                                            <FormControlLabel value="apartments" control={<Radio />} label={t(tokens.announcements.visibilityValues.specificApartments)} />
                                                            <FormControlLabel value="tenants" control={<Radio />} label={t(tokens.announcements.visibilityValues.specificTenants)} />
                                                       </RadioGroup>
                                                  </FormControl>

                                                  {formik.values.visibility === 'apartments' && (
                                                       <FormControl fullWidth disabled={formDisabled}>
                                                            <InputLabel id="apartments-label">{t(tokens.announcements.form.apartments)}</InputLabel>
                                                            <Select
                                                                 labelId="apartments-label"
                                                                 multiple
                                                                 value={formik.values.apartments}
                                                                 input={<OutlinedInput label={t(tokens.announcements.form.apartments)} />}
                                                                 onChange={e => setFieldArray('apartments', e.target.value as string[])}
                                                                 renderValue={(selected) => (
                                                                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                           {(selected as string[]).map(value => (
                                                                                <Chip key={value} label={apartments.find(a => a.id === value)?.id || value} />
                                                                           ))}
                                                                      </Box>
                                                                 )}
                                                                 disabled={formDisabled}
                                                            >
                                                                 {apartments.map(ap => (
                                                                      <MenuItem key={ap.id} value={ap.id}>{ap.apartment_number}</MenuItem>
                                                                 ))}
                                                            </Select>
                                                       </FormControl>
                                                  )}

                                                  {formik.values.visibility === 'tenants' && (
                                                       <FormControl fullWidth disabled={formDisabled}>
                                                            <InputLabel id="tenants-label">{t(tokens.announcements.form.tenants)}</InputLabel>
                                                            <Select
                                                                 labelId="tenants-label"
                                                                 multiple
                                                                 value={formik.values.tenants}
                                                                 input={<OutlinedInput label={t(tokens.announcements.form.tenants)} />}
                                                                 onChange={e => setFieldArray('tenants', e.target.value as string[])}
                                                                 renderValue={(selected) => (
                                                                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                           {(selected as string[]).map(value => (
                                                                                <Chip key={value} label={tenants.find(t => t.id === value)?.id || value} />
                                                                           ))}
                                                                      </Box>
                                                                 )}
                                                                 disabled={formDisabled}
                                                            >
                                                                 {tenants.map(tn => (
                                                                      <MenuItem key={tn.id} value={tn.id}>{tn.first_name + ' ' + tn.last_name}</MenuItem>
                                                                 ))}
                                                            </Select>
                                                       </FormControl>
                                                  )}

                                                  {/* Images Section */}
                                                  <Divider sx={{ my: 1 }} />
                                                  <Stack spacing={1}>
                                                       <Stack direction="row" alignItems="center" spacing={2}>
                                                            <Button variant="outlined" component="label" disabled={!editingEntity || imagesUploading}>
                                                                 {imagesUploading ? t(tokens.announcements.form.uploading) : t(tokens.announcements.form.uploadImages)}
                                                                 <input type="file" hidden multiple accept="image/*" onChange={handleImagesUpload} />
                                                            </Button>
                                                            <Button color="error" disabled={!editingEntity || currentImages.length === 0 || formDisabled} onClick={handleRemoveAllImages}>{t(tokens.announcements.form.removeAllImages)}</Button>
                                                            <Typography variant="caption" color="text.secondary">{t(tokens.announcements.form.imagesCount, { count: currentImages.length })}</Typography>
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
                                                  {/* Documents Section */}
                                                  <Divider sx={{ my: 2 }} />
                                                  <Stack spacing={1}>
                                                       <Stack direction="row" alignItems="center" spacing={2}>
                                                            <Button variant="outlined" component="label" disabled={!editingEntity || docsUploading}>
                                                                 {docsUploading ? t(tokens.announcements.form.uploading) : t(tokens.announcements.form.uploadDocuments || 'Upload documents')}
                                                                 <input type="file" hidden multiple onChange={handleDocumentsUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.odt,.ods,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.oasis.opendocument.text,application/vnd.oasis.opendocument.spreadsheet,application/zip" />
                                                            </Button>
                                                            <Button color="error" disabled={!editingEntity?.id || currentDocuments.length === 0 || formDisabled} onClick={handleRemoveAllDocuments}>{t(tokens.announcements.form.removeAllDocuments || 'Remove all documents')}</Button>
                                                            <Typography variant="caption" color="text.secondary">{t(tokens.announcements.form.documentsCount || 'Documents: {{count}}', { count: currentDocuments.length })}</Typography>
                                                       </Stack>
                                                       {currentDocuments.length > 0 && (
                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                                 {currentDocuments.map((doc: any) => (
                                                                      <Box key={doc.url} sx={{ position: 'relative', width: 140, p: 1, borderRadius: 1, border: theme => `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                           <Typography variant="caption" noWrap title={doc.name} sx={{ flexGrow: 1 }}>{doc.name}</Typography>
                                                                           <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                                                                                <Button size="small" variant="text" onClick={() => window.open(doc.url, '_blank')}>{t(tokens.common.btnDownload)}</Button>
                                                                                <IconButton size="small" onClick={() => handleRemoveDocument(doc.url)}><DeleteIcon fontSize="inherit" /></IconButton>
                                                                           </Stack>
                                                                      </Box>
                                                                 ))}
                                                            </Box>
                                                       )}
                                                       {docsUploading && <LinearProgress sx={{ mt: 1 }} />}
                                                  </Stack>
                                                  <Divider sx={{ my: 1 }} />
                                                  <Stack direction="row" spacing={3} height={40} alignItems="center" sx={{ opacity: formDisabled ? 0.6 : 1 }}>
                                                       <FormControlLabel disabled={formDisabled} control={<Checkbox checked={formik.values.pinned} onChange={e => formik.setFieldValue('pinned', e.target.checked)} />} label={t(tokens.announcements.form.pinToTop)} />
                                                       <FormControlLabel disabled={formDisabled} control={<Checkbox checked={formik.values.schedule_enabled} onChange={e => formik.setFieldValue('schedule_enabled', e.target.checked)} />} label={t(tokens.announcements.form.schedule)} />
                                                       {formik.values.schedule_enabled && (
                                                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                                 <DatePicker
                                                                      label={t(tokens.announcements.form.scheduleAt)}
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
                                                            {t(tokens.announcements.actions.saveDraft)}
                                                       </Button>
                                                       {formik.values.status === 'published' ? (
                                                            <Button
                                                                 variant="contained"
                                                                 color="warning"
                                                                 onClick={handleUnpublish}
                                                                 disabled={formDisabled || !editingEntity?.id || rowBusy === editingEntity?.id}
                                                            >
                                                                 {t(tokens.announcements.actions.unpublish)}
                                                            </Button>
                                                       ) : (
                                                            <Button
                                                                 variant="contained"
                                                                 onClick={handlePublish}
                                                                 disabled={formDisabled || !editingEntity?.id || !!formik.errors.title || !!formik.errors.message || !!formik.errors.category || !!formik.errors.subcategory}
                                                                 loading={formik.isSubmitting && formik.values.status !== 'draft'}>
                                                                 {t(tokens.announcements.actions.publish)}
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
                                        <Typography variant="h6" sx={{ mb: 2 }}>{t(tokens.announcements.table.heading)}</Typography>
                                        <TableContainer sx={{ flexGrow: 1 }}>
                                             <Table size="small">
                                                  <TableHead>
                                                       <TableRow>
                                                            <TableCell>{t(tokens.announcements.table.colTitle)}</TableCell>
                                                            <TableCell align="right">{t(tokens.announcements.table.colActions)}</TableCell>
                                                       </TableRow>
                                                  </TableHead>
                                                  <TableBody>
                                                       {announcements.length === 0 && (
                                                            <TableRow>
                                                                 <TableCell colSpan={2}>
                                                                      <Typography variant="body2" color="text.secondary">{t(tokens.announcements.table.noData)}</Typography>
                                                                 </TableCell>
                                                            </TableRow>
                                                       )}
                                                       {announcements.map(row => (
                                                            <TableRow
                                                                 key={row.id}
                                                                 onClick={() => handleEdit(row.id)}
                                                                 hover
                                                                 sx={{ backgroundColor: editingEntity?.id === row.id ? 'action.selected' : 'inherit' }}>
                                                                 <TableCell sx={{ maxWidth: 240, cursor: 'pointer' }}>
                                                                      <Stack direction="row" spacing={1} alignItems="center">
                                                                           {row.pinned && <PushPinIcon color="primary" fontSize="small" />}
                                                                           <Typography variant="body2" noWrap title={row.title}>{row.title}</Typography>
                                                                      </Stack>
                                                                 </TableCell>
                                                                 <TableCell align="right">
                                                                      <Tooltip title={row.pinned ? t(tokens.announcements.table.unpin) : t(tokens.announcements.table.pin)}>
                                                                           <IconButton size="small" onClick={() => togglePin(row.id)} disabled={rowBusy === row.id}>
                                                                                {row.pinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
                                                                           </IconButton>
                                                                      </Tooltip>
                                                                      <Tooltip title={row.archived ? t(tokens.announcements.table.unarchive) : t(tokens.announcements.table.archive)}>
                                                                           <IconButton size="small" onClick={() => toggleArchive(row.id)} disabled={rowBusy === row.id}>
                                                                                {row.archived ? <ArchiveIcon fontSize="small" /> : <ArchiveOutlinedIcon fontSize="small" />}
                                                                           </IconButton>
                                                                      </Tooltip>
                                                                      <Tooltip title={t(tokens.announcements.table.delete)}>
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
                              title={t(tokens.announcements.modals.deleteTitle)}
                              type="confirmation"
                              confirmText={t(tokens.common.btnDelete)}
                              cancelText={t(tokens.common.btnCancel)}
                         >
                              {t(tokens.announcements.modals.deleteMessage)}
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
                              title={t(tokens.announcements.modals.removeImagesTitle)}
                              type="confirmation"
                              confirmText={t(tokens.common.btnRemove)}
                              cancelText={t(tokens.common.btnCancel)}
                         >
                              {t(tokens.announcements.modals.removeImagesMessage)}
                         </PopupModal>
                    )
               }
               {
                    modalState?.type === 'remove-all-documents' && (
                         <PopupModal
                              isOpen
                              onClose={() => setModalState(null)}
                              onConfirm={async () => {
                                   if (modalState.targetId) await performRemoveAllDocuments(modalState.targetId);
                                   setModalState(null);
                              }}
                              title={t(tokens.announcements.modals.removeDocumentsTitle || tokens.announcements.modals.removeImagesTitle)}
                              type="confirmation"
                              confirmText={t(tokens.common.btnRemove)}
                              cancelText={t(tokens.common.btnCancel)}
                         >
                              {t(tokens.announcements.modals.removeDocumentsMessage || tokens.announcements.modals.removeImagesMessage)}
                         </PopupModal>
                    )
               }
          </Container>

     );
}
