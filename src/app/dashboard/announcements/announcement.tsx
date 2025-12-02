"use client";

import React, { useMemo, useState, useEffect } from 'react';
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
     CardHeader,
     Alert
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import LinearProgress from '@mui/material/LinearProgress';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ArchiveIcon from '@mui/icons-material/Archive';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import QuillEditor from 'src/components/quill-editor';
import { PopupModal } from 'src/components/modal-dialog';
import { useFormik } from 'formik';
import { announcementInitialValues, buildAnnouncementValidationSchema, ANNOUNCEMENT_CATEGORIES, Announcement } from 'src/types/announcement';
import { upsertAnnouncement, getAnnouncementById, deleteAnnouncement, togglePinAction, publishAnnouncement, revertToDraft, toggleArchiveAction } from 'src/app/actions/announcement/announcement-actions';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';
import { DatePicker, TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { Client } from 'src/types/client';
import { Building } from 'src/types/building';
import { EntityFormHeader } from 'src/components/entity-form-header';
import { paths } from 'src/paths';

interface AnnouncementProps {
     announcements: Announcement[];
     client: Client
     buildings: Building[]
}

export default function Announcements({ client, announcements, buildings }: AnnouncementProps) {

     // Using server-provided announcements directly; any mutations trigger a router refresh.
     const [editingEntity, setEditingEntity] = useState<Announcement | null>(null);
     const [rowBusy, setRowBusy] = useState<string | null>(null);
     const [imagesUploading, setImagesUploading] = useState(false);
     const [docsUploading, setDocsUploading] = useState(false);
     const [modalState, setModalState] = useState<null | { type: 'delete-announcement' | 'remove-all-images' | 'remove-all-documents' | 'confirm-publish'; targetId?: string }>(null);

     const uploadingBusy = imagesUploading || docsUploading; // only busy during media uploads
     const router = useRouter();

     const { t } = useTranslation();

     // Local UI state for separate date & time pickers (avoid partial invalid ISO writes)
     const [scheduledDate, setScheduledDate] = useState<Dayjs | null>(null);
     const [scheduledTime, setScheduledTime] = useState<Dayjs | null>(null);

     const formik = useFormik({
          initialValues: { ...announcementInitialValues, client_id: client.id },
          validationSchema: buildAnnouncementValidationSchema(t),
          // Do not validate on mount; defer validation feedback until user interaction or submit
          validateOnMount: false,
          onSubmit: async (values, helpers) => {
               helpers.setSubmitting(true);
               // Build payload mapping to server expectations
               const payload: any = {
                    title: values.title.trim(),
                    message: values.message,
                    category: values.category || null,
                    subcategory: values.subcategory || null,
                    buildings: values.buildings || [],
                    pinned: values.pinned,
                    client_id: client.id,
                    schedule_enabled: values.schedule_enabled,
                    scheduled_at: values.schedule_enabled ? values.scheduled_at : null,
                    scheduled_timezone: values.schedule_enabled ? values.scheduled_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone : null,
                    status: values.status,
               };

               // Include id when editing so we update instead of creating a new row
               if (editingEntity) {
                    payload.id = editingEntity.id;
               }

               const result = await upsertAnnouncement(payload);
               if (!result.success) {
                    helpers.setSubmitting(false);
                    toast.error(t(tokens.announcements.toasts.saveError));
                    helpers.setStatus({ error: result.error });
                    return;
               }

               if (result.data) {
                    toast.success(t(tokens.announcements.toasts.saveSuccess));
                    // Keep editing; reset form to saved values and preserve media arrays locally
                    const saved = result.data as Announcement;
                    const updated: Announcement = {
                         ...saved,
                         images: (editingEntity?.images || []),
                         documents: (editingEntity?.documents || []),
                    } as any;
                    setEditingEntity(updated);
                    formik.resetForm({
                         values: {
                              id: updated.id!,
                              title: updated.title || '',
                              message: updated.message || '',
                              category: updated.category || '',
                              subcategory: updated.subcategory || '',
                              buildings: updated.buildings || [],
                              attachments: [],
                              pinned: !!updated.pinned,
                              schedule_enabled: !!updated.scheduled_at,
                              created_at: updated.created_at,
                              scheduled_at: updated.scheduled_at || null,
                              scheduled_timezone: (updated as any).scheduled_timezone || null,
                              status: (updated as any).status ?? ((updated as any).published_at ? 'published' : 'draft'),
                              user_id: updated.user_id,
                              images: (updated.images && updated.images.length ? updated.images : []),
                              documents: (updated.documents && updated.documents.length ? updated.documents : []),
                              client_id: client.id,
                         }
                    });
                    // Make sure the list/table reflects latest changes
                    router.refresh();
               }
          }
     });

     // Helper to decide when to show an error for a field (user has interacted or submitted)
     const showFieldError = (name: string) => !!(formik.touched as any)[name] || formik.submitCount > 0;
     // Ensure client_id is always set and never surfaces as an error
     useEffect(() => {
          if (formik.values.client_id !== client.id) {
               formik.setFieldValue('client_id', client.id, false);
          }
     }, [client.id]);

     const isDraft = formik.values.status === 'draft';
     const hasErrors = Object.keys(formik.errors).length > 0;
     const canSaveDraft = isDraft && formik.dirty && !hasErrors;
     const inputsDisabled = uploadingBusy || !isDraft;

     // Auto-fill timezone if scheduling is enabled and timezone not yet captured
     useEffect(() => {
          if (formik.values.schedule_enabled && !formik.values.scheduled_timezone) {
               const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
               formik.setFieldValue('scheduled_timezone', tz, false);
          }
     }, [formik.values.schedule_enabled, formik.values.scheduled_timezone]);

     // Derive current images/documents from formik for immediate reflection of optimistic updates;
     // fall back to editingEntity data if formik arrays are empty but entity has media.
     const currentImages = useMemo(() => {
          if (!editingEntity) return [] as string[];
          const formImages = (formik.values.images || []) as string[];
          if (formImages.length > 0) return formImages;
          return editingEntity.images || [];
     }, [editingEntity, formik.values.images]);
     const currentDocuments = useMemo(() => {
          if (!editingEntity) return [] as { url: string; name: string; mime?: string }[];
          const formDocs = (formik.values.documents || []) as { url: string; name: string; mime?: string }[];
          if (formDocs.length > 0) return formDocs;
          return editingEntity.documents || [];
     }, [editingEntity, formik.values.documents]);

     const handlePublishClick = () => {
          setModalState({ type: 'confirm-publish', targetId: editingEntity?.id });
     }

     const handlePublish = async () => {
          formik.setSubmitting(true);
          // New announcement (no editingEntity): use existing submit flow to create & publish
          if (!editingEntity) return; // guarded by disabled state anyway
          // Existing draft -> publish via server action so published_at is set
          const typeInfo = {
               value: 'announcement' as const,
               labelToken: t(tokens.notifications.tabs.announcement),
          };
          const res = await publishAnnouncement(editingEntity.id, typeInfo);

          if (!res.success) {
               toast.error(t(tokens.announcements.toasts.publishError));
               return;
          }
          toast.success(t(tokens.announcements.toasts.publishSuccess));
          formik.setFieldValue('status', 'published');
          formik.setSubmitting(false);
          // refresh list
          router.refresh();
     };

     const handleUnpublish = async () => {
          formik.setSubmitting(true);
          if (!editingEntity) return;
          const res = await revertToDraft(editingEntity.id);
          if (!res.success) {
               toast.error(t(tokens.announcements.toasts.unpublishError));
               return;
          }
          toast.success(t(tokens.announcements.toasts.unpublishSuccess));
          formik.setFieldValue('status', 'draft');
          formik.setSubmitting(false);
          router.refresh();
     };

     const handleSave = () => {
          // Preserve current status; submission will not flip published↔draft
          formik.handleSubmit();
     };

     const hydrateScheduledAt = (raw: string | null | undefined) => {
          if (!raw) {
               setScheduledDate(null);
               setScheduledTime(null);
               return;
          }
          let normalized = raw.trim();
          // If legacy ISO with Z or offset, convert to naive local wall time string by taking date+time components only
          // Examples: 2025-10-03T09:30:00Z or 2025-10-03T09:30:00+02:00 -> 2025-10-03T09:30:00
          const isoMatch = normalized.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
          if (isoMatch) {
               normalized = isoMatch[1];
          }
          const d = dayjs(normalized, 'YYYY-MM-DDTHH:mm:ss');
          if (!d.isValid()) return;
          setScheduledDate(d.startOf('day'));
          setScheduledTime(d);
          // Also push normalized value back into form if it differs (avoid marking dirty if same)
          if (formik.values.scheduled_at !== normalized) {
               formik.setFieldValue('scheduled_at', normalized, false);
          }
     };

     const composeScheduledLocal = (dateVal: Dayjs | null, timeVal: Dayjs | null) => {
          if (!dateVal || !timeVal) return null;
          const combined = dateVal
               .hour(timeVal.hour())
               .minute(timeVal.minute())
               .second(0)
               .millisecond(0);
          // Return naive local string without timezone designator
          return combined.format('YYYY-MM-DDTHH:mm:ss');
     };

     const handleEdit = async (id: string) => {
          const res = await getAnnouncementById(id);

          if (!res.success || !res.data) return;
          const a: Announcement = res.data;
          setEditingEntity(a);
          // Reset form to loaded values so dirty=false until user changes something
          formik.resetForm({
               values: {
                    id: id,
                    title: a.title || '',
                    message: a.message || '',
                    category: a.category || '',
                    subcategory: a.subcategory || '',
                    buildings: a.buildings,
                    attachments: [],
                    pinned: !!a.pinned,
                    schedule_enabled: !!a.scheduled_at,
                    created_at: a.created_at,
                    scheduled_at: a.scheduled_at || null,
                    scheduled_timezone: (a as any).scheduled_timezone || null,
                    status: a.status ?? ((a as any).published_at ? 'published' : 'draft'),
                    user_id: a.user_id,
                    images: (a.images && a.images.length ? a.images : []),
                    documents: (a.documents && a.documents.length ? a.documents : []),
                    client_id: a.client_id!,
               }
          });
          hydrateScheduledAt(
               a.scheduled_at
                    ? (typeof a.scheduled_at === 'string'
                         ? a.scheduled_at
                         : ((a as any).scheduled_at instanceof Date ? dayjs((a as any).scheduled_at).format('YYYY-MM-DDTHH:mm:ss') : null))
                    : null
          );
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
               const { uploadEntityFiles } = await import('src/libs/supabase/sb-storage');
               const result = await uploadEntityFiles({
                    entity: 'announcement-image',
                    entityId: editingEntity.id,
                    files: fileList as any,
               });

               if (!result.success) {
                    toast.error(result.error || t(tokens.announcements.toasts.uploadFailed));
               } else {
                    const newUrls = result.signedUrls ?? [];
                    if (newUrls.length) {
                         toast.success(t(tokens.announcements.toasts.imagesUploaded));
                         const current = formik.values.images || [];
                         formik.setFieldValue('images', [...current, ...newUrls]);
                    }
               }
          } finally {
               setImagesUploading(false);
               e.target.value = '';
               // Optional server refresh for persistence; keep to ensure consistency
               router.refresh();
          }
     };

     const handleRemoveImage = async (url: string) => {
          if (!editingEntity) return;
          const { removeEntityFile } = await import('src/libs/supabase/sb-storage');
          const res = await removeEntityFile({
               entity: 'announcement-image',
               entityId: editingEntity.id,
               storagePathOrUrl: url,
          });
          if (!res.success) {
               toast.error(res.error || t(tokens.announcements.toasts.removeImageFailed));
          } else {
               toast.success(t(tokens.announcements.toasts.removeImageSuccess));
               // Optimistically remove from formik
               formik.setFieldValue('images', (formik.values.images || []).filter(i => i !== url));
               router.refresh();
          }
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
               const { uploadEntityFiles } = await import('src/libs/supabase/sb-storage');
               const result = await uploadEntityFiles({
                    entity: 'announcement-document',
                    entityId: editingEntity.id,
                    files: fileList as any,
               });

               if (!result.success) {
                    toast.error(result.error || t(tokens.announcements.toasts.uploadFailed));
               } else {
                    const signedUrls = result.signedUrls ?? [];
                    const records = result.records ?? [];
                    if (signedUrls.length) {
                         toast.success(t(tokens.announcements.toasts.documentsUploaded || tokens.announcements.toasts.imagesUploaded));
                         const docsToAppend = signedUrls.map((url, idx) => {
                              const record = records[idx] as Record<string, any> | undefined;
                              return {
                                   url,
                                   name: (record?.file_name as string) ?? url.split('?')[0]?.split('/').pop() ?? 'document',
                                   mime: (record?.mime_type as string) ?? undefined,
                              };
                         });
                         const current = (formik.values.documents || []) as { url: string; name: string; mime?: string }[];
                         formik.setFieldValue('documents', [...current, ...docsToAppend]);
                    }
               }
          } finally {
               setDocsUploading(false);
               e.target.value = '';
               router.refresh();
          }
     };

     const handleRemoveDocument = async (url: string) => {
          if (!editingEntity) return;
          const { removeEntityFile } = await import('src/libs/supabase/sb-storage');
          const res = await removeEntityFile({
               entity: 'announcement-document',
               entityId: editingEntity.id,
               storagePathOrUrl: url,
          });
          if (!res.success) {
               toast.error(res.error || t(tokens.announcements.toasts.removeImageFailed));
          } else {
               toast.success(t(tokens.announcements.toasts.removeImageSuccess));
               formik.setFieldValue('documents', (formik.values.documents || []).filter((d: any) => d.url !== url));
               router.refresh();
          }
     };

     const handleRemoveAllDocuments = async () => {
          if (!editingEntity) return;
          setModalState({ type: 'remove-all-documents', targetId: editingEntity.id });
     };

     const performRemoveAllDocuments = async (id: string) => {
          const { removeAllEntityFiles } = await import('src/libs/supabase/sb-storage');
          const res = await removeAllEntityFiles({
               entity: 'announcement-document',
               entityId: id,
          });
          if (!res.success) {
               toast.error(res.error || t(tokens.announcements.toasts.removeImagesFailed));
          } else {
               toast.success(t(tokens.announcements.toasts.removeImagesSuccess));
               formik.setFieldValue('documents', []);
               router.refresh();
          }
     };

     const performRemoveAllImages = async (id: string) => {
          formik.setSubmitting(true);
          const { removeAllEntityFiles } = await import('src/libs/supabase/sb-storage');
          const res = await removeAllEntityFiles({
               entity: 'announcement-image',
               entityId: id,
          });
          if (!res.success) {
               toast.error(res.error || t(tokens.announcements.toasts.removeImagesFailed));
          } else {
               toast.success(t(tokens.announcements.toasts.removeImagesSuccess));
               formik.setFieldValue('images', []);
               formik.setSubmitting(false);
               router.refresh();
          }
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
          formik.setSubmitting(true);
          setRowBusy(id);
          const res = await deleteAnnouncement(id);
          if (!res.success) toast.error(t(tokens.announcements.toasts.deleteFailed)); else {
               toast.success(t(tokens.announcements.toasts.deleted));
               if (editingEntity!.id === id!) {
                    formik.resetForm({
                         values: { ...announcementInitialValues, created_at: new Date(), client_id: client.id }
                    });
                    setEditingEntity(null);
               }
          }
          formik.resetForm({
               values: { ...announcementInitialValues, client_id: client.id }
          });
          formik.setSubmitting(false);
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
                    <EntityFormHeader
                         backHref={paths.dashboard.index}
                         backLabel={t('nav.adminDashboard')}
                         title={t(tokens.announcements.managementTitle)}
                         breadcrumbs={[
                              { title: t('nav.adminDashboard'), href: paths.dashboard.index },
                              { title: t(tokens.announcements.managementTitle) },
                         ]}
                         actionLabel={t(tokens.announcements.createNew)}
                         onActionClick={() => {
                              setEditingEntity(null);
                              formik.resetForm({
                                   values: { ...announcementInitialValues, created_at: new Date(), client_id: client.id }
                              });
                         }}
                    />
                    <Card>
                         <Grid container>
                              {/* Table Column */}
                              <Grid size={{ xs: 12, md: 6, lg: 5 }}>
                                   <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant="h6" sx={{ mb: 2 }}>{t(tokens.announcements.table.heading)}</Typography>
                                        <TableContainer
                                             sx={{
                                                  flexGrow: 1,
                                                  position: 'relative',
                                                  overflowX: 'auto',
                                                  WebkitOverflowScrolling: 'touch',
                                                  // Add subtle fade edges to indicate scrollability on narrow screens
                                                  '&:before, &:after': {
                                                       content: '""',
                                                       position: 'absolute',
                                                       top: 0,
                                                       bottom: 0,
                                                       width: 16,
                                                       pointerEvents: 'none',
                                                       zIndex: 2,
                                                  },
                                                  '&:before': {
                                                       left: 0,
                                                       background: (theme) => `linear-gradient(to right, ${theme.palette.background.paper} 40%, rgba(0,0,0,0))`,
                                                  },
                                                  '&:after': {
                                                       right: 0,
                                                       background: (theme) => `linear-gradient(to left, ${theme.palette.background.paper} 40%, rgba(0,0,0,0))`,
                                                  },
                                             }}
                                        >
                                             <Table size="small" stickyHeader sx={{ width: '100%', tableLayout: 'auto' }}>
                                                  <TableHead>
                                                       <TableRow>
                                                            <TableCell sx={{ width: 'auto' }}>{t(tokens.announcements.table.colTitle)}</TableCell>
                                                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t(tokens.announcements.table.colActions)}</TableCell>
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
                                                                 <TableCell sx={{ py: 0.5 }}>
                                                                      <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
                                                                           {row.pinned && <PushPinIcon color="primary" fontSize="small" style={{ marginTop: 2 }} />}
                                                                           <Typography
                                                                                variant="body2"
                                                                                title={row.title}
                                                                                sx={{ cursor: 'pointer', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word', lineHeight: 1.4 }}
                                                                           >
                                                                                {row.title}
                                                                           </Typography>
                                                                      </Stack>
                                                                 </TableCell>
                                                                 <TableCell align="right" sx={{ whiteSpace: 'nowrap', py: 0.5 }}>
                                                                      <Tooltip title={row.pinned ? t(tokens.announcements.table.unpin) : t(tokens.announcements.table.pin)}>
                                                                           <IconButton size="small" onClick={() => togglePin(row.id)} disabled={rowBusy === row.id}>
                                                                                {row.pinned ? <PushPinIcon fontSize="small" color="primary" /> : <PushPinOutlinedIcon fontSize="small" color="primary" />}
                                                                           </IconButton>
                                                                      </Tooltip>
                                                                      <Tooltip title={row.archived ? t(tokens.announcements.table.unarchive) : t(tokens.announcements.table.archive)}>
                                                                           <IconButton size="small" onClick={() => toggleArchive(row.id)} disabled={rowBusy === row.id}>
                                                                                {row.archived ? <ArchiveIcon fontSize="small" color="primary" /> : <ArchiveOutlinedIcon fontSize="small" color="primary" />}
                                                                           </IconButton>
                                                                      </Tooltip>
                                                                      <Tooltip title={t(tokens.announcements.table.delete)}>
                                                                           <IconButton size="small" onClick={() => handleDelete(row.id)} disabled={rowBusy === row.id}>
                                                                                <DeleteIcon fontSize="small" color="primary" />
                                                                           </IconButton>
                                                                      </Tooltip>
                                                                      <Tooltip title={row.status === 'published' ? t(tokens.announcements.status.published) : t(tokens.announcements.status.draft)}>
                                                                           <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 4 }}>
                                                                                {row.status === 'published' ? (
                                                                                     <AnnouncementIcon fontSize="small" color="primary" />
                                                                                ) : (
                                                                                     <RadioButtonUncheckedIcon fontSize="small" color="primary" />
                                                                                )}
                                                                           </span>
                                                                      </Tooltip>
                                                                 </TableCell>
                                                            </TableRow>
                                                       ))}
                                                  </TableBody>
                                             </Table>
                                        </TableContainer>
                                   </Paper>
                              </Grid>
                              {/* Form Column */}
                              <Grid size={{ xs: 12, md: 6, lg: 7 }} sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                   <Paper variant="outlined" sx={{ p: 3, position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                        {uploadingBusy && (
                                             <Box sx={{ position: 'absolute', inset: 0, zIndex: 10, bgcolor: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                  <Typography variant="body2" color="text.secondary">{t(tokens.announcements.uploadingImages)}</Typography>
                                             </Box>
                                        )}
                                        <Box component="fieldset" disabled={inputsDisabled} sx={{ border: 0, p: 0, m: 0, pointerEvents: inputsDisabled ? 'none' : 'auto', opacity: inputsDisabled ? 0.6 : 1 }}>
                                             <Stack spacing={2}>
                                                  {/* Title Field with reserved helper space */}
                                                  <Box sx={{ minWidth: 0 }}>
                                                       <TextField
                                                            label={t(tokens.announcements.form.title)}
                                                            name="title"
                                                            value={formik.values.title}
                                                            onChange={formik.handleChange}
                                                            onBlur={formik.handleBlur}
                                                            error={Boolean(formik.errors.title) && showFieldError('title')}
                                                            helperText={showFieldError('title') && formik.errors.title ? formik.errors.title : ' '}
                                                            slotProps={{ formHelperText: { sx: { minHeight: 18, mt: 0.5 } } }}
                                                            fullWidth
                                                            required={formik.values.status === 'published'}
                                                            disabled={inputsDisabled}
                                                       />
                                                  </Box>
                                                  <Box sx={{ pointerEvents: inputsDisabled ? 'none' : 'auto', opacity: inputsDisabled ? 0.7 : 1, gap: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                                       <QuillEditor
                                                            value={formik.values.message}
                                                            onChange={(v) => formik.setFieldValue('message', v)}
                                                            onBlur={() => formik.setFieldTouched('message', true)}
                                                       />
                                                       <Box sx={{ minHeight: 25, mt: 0.5 }}>
                                                            {showFieldError('message') && formik.errors.message ? (
                                                                 <Typography variant="caption" color="error">{formik.errors.message}</Typography>
                                                            ) : ' '}
                                                       </Box>
                                                  </Box>
                                                  {/* Category / Subcategory row now fluid: always row with wrap so they shrink before stacking */}
                                                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit,minmax(160px,1fr))' }, gap: 1.5, minWidth: 0 }}>
                                                       <FormControl sx={{ minWidth: 0, width: '100%' }} disabled={inputsDisabled}>
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
                                                                 disabled={inputsDisabled}
                                                            >
                                                                 {ANNOUNCEMENT_CATEGORIES.map(cat => (
                                                                      <MenuItem key={cat.id} value={cat.id}>{t(tokens.announcements.categories[cat.id as keyof typeof tokens.announcements.categories])}</MenuItem>
                                                                 ))}
                                                            </Select>
                                                            <Box sx={{ minHeight: 25, mt: 0.5 }}>
                                                                 {showFieldError('category') && formik.errors.category ? (
                                                                      <Typography variant="caption" color="error">{formik.errors.category}</Typography>
                                                                 ) : ' '}
                                                            </Box>
                                                       </FormControl>

                                                       {(() => {
                                                            const cat = ANNOUNCEMENT_CATEGORIES.find(c => c.id === formik.values.category);
                                                            if (!cat || cat.subcategories.length === 0) return null;
                                                            return (
                                                                 <FormControl sx={{ minWidth: 0, width: '100%' }} disabled={inputsDisabled}>
                                                                      <InputLabel id="subcategory-label">{t(tokens.announcements.form.subcategory)}</InputLabel>
                                                                      <Select
                                                                           labelId="subcategory-label"
                                                                           name="subcategory"
                                                                           value={formik.values.subcategory}
                                                                           label={t(tokens.announcements.form.subcategory)}
                                                                           onChange={formik.handleChange}
                                                                           onBlur={formik.handleBlur}
                                                                           fullWidth
                                                                           disabled={inputsDisabled}
                                                                      >
                                                                           {cat.subcategories.map(sc => (
                                                                                <MenuItem key={sc.id} value={sc.id}>{t(tokens.announcements.subcategories[sc.id as keyof typeof tokens.announcements.subcategories])}</MenuItem>
                                                                           ))}
                                                                      </Select>
                                                                      <Box sx={{ minHeight: 25, mt: 0.5 }}>
                                                                           {showFieldError('subcategory') && formik.errors.subcategory ? (
                                                                                <Typography variant="caption" color="error">{formik.errors.subcategory as string}</Typography>
                                                                           ) : ' '}
                                                                      </Box>
                                                                 </FormControl>
                                                            );
                                                       })()}
                                                  </Box>
                                                  {/* Buildings multi-select searchable Autocomplete */}
                                                  <FormControl fullWidth disabled={inputsDisabled} sx={{ minWidth: 0, width: '100%' }}>
                                                       <Autocomplete
                                                            multiple
                                                            disableCloseOnSelect
                                                            options={(buildings || []).map(b => {
                                                                 let label = b.id;
                                                                 if (b?.building_location) {
                                                                      const loc: any = b.building_location || {};
                                                                      const parts = [loc.street_address, loc.street_number, loc.city].filter(Boolean);
                                                                      if (parts.length) label = parts.join(' ');
                                                                 }
                                                                 return { id: b.id, label };
                                                            }).sort((a, b) => a.label.localeCompare(b.label))}
                                                            value={(formik.values.buildings || []).map(id => {
                                                                 const b = buildings.find(x => x.id === id);
                                                                 let label = id;
                                                                 if (b?.building_location) {
                                                                      const loc: any = b.building_location || {};
                                                                      const parts = [loc.street_address, loc.street_number, loc.city].filter(Boolean);
                                                                      if (parts.length) label = parts.join(' ');
                                                                 }
                                                                 return { id, label };
                                                            })}
                                                            onChange={(e, newVal) => {
                                                                 formik.setFieldValue('buildings', newVal.map(v => v.id));
                                                                 if (!formik.touched.buildings) {
                                                                      formik.setFieldTouched('buildings', true, false);
                                                                 }
                                                            }}
                                                            getOptionLabel={(option) => option.label}
                                                            isOptionEqualToValue={(o, v) => o.id === v.id}
                                                            renderInput={(params) => (
                                                                 <TextField
                                                                      {...params}
                                                                      label={t('buildings.buildingsTitle')}
                                                                      placeholder={t('common.search')}
                                                                      size="small"
                                                                 />
                                                            )}
                                                            renderOption={(props, option, { selected }) => {
                                                                 // Extract key so it isn't spread (React warns if key is inside spread object)
                                                                 const { key, ...rest } = props as any;
                                                                 return (
                                                                      <li key={key} {...rest} data-id={option.id} style={{ display: 'flex', alignItems: 'center' }}>
                                                                           <Checkbox
                                                                                checked={selected}
                                                                                style={{ marginRight: 8 }}
                                                                           />
                                                                           <Typography variant="body2" noWrap>{option.label}</Typography>
                                                                      </li>
                                                                 );
                                                            }}
                                                            slotProps={{
                                                                 listbox: { sx: { maxHeight: 5 * 40, overflowY: 'auto' } },
                                                                 popper: { sx: { '& .MuiAutocomplete-paper': { maxWidth: 400 } } },
                                                            }}
                                                       />
                                                       <Box sx={{ minHeight: 18, mt: 0.5 }}>
                                                            {showFieldError('buildings') && formik.errors.buildings ? (
                                                                 <Typography variant="caption" color="error">{formik.errors.buildings as any}</Typography>
                                                            ) : ' '}
                                                       </Box>
                                                  </FormControl>
                                                  {/* Images Section */}
                                                  <Divider sx={{ my: 1 }} />
                                                  <Stack spacing={1}>
                                                       <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} spacing={{ xs: 1.5, sm: 2 }}>
                                                            <Button variant="outlined" component="label" disabled={!editingEntity || imagesUploading || !isDraft} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                                                                 {imagesUploading ? t(tokens.announcements.form.uploading) : t(tokens.announcements.form.uploadImages)}
                                                                 <input type="file" hidden multiple accept="image/*" onChange={handleImagesUpload} />
                                                            </Button>
                                                            <Button color="error" disabled={!editingEntity || currentImages.length === 0 || inputsDisabled} onClick={handleRemoveAllImages} sx={{ width: { xs: '100%', sm: 'auto' } }}>{t(tokens.announcements.form.removeAllImages)}</Button>
                                                            <Typography variant="caption" color="text.secondary" sx={{ width: { xs: '100%', sm: 'auto' } }}>{t(tokens.announcements.form.imagesCount, { count: currentImages.length })}</Typography>
                                                       </Stack>
                                                       {currentImages.length > 0 && (
                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                                 {currentImages.map(url => (
                                                                      <Box key={url} sx={{ position: 'relative', width: 80, height: 80, borderRadius: 1, overflow: 'hidden', border: theme => `1px solid ${theme.palette.divider}` }}>
                                                                           {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                           <img src={url} alt="ann-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                           {isDraft && (
                                                                                <button type="button" onClick={() => handleRemoveImage(url)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10, padding: '2px 4px' }}>x</button>
                                                                           )}
                                                                      </Box>
                                                                 ))}
                                                            </Box>
                                                       )}
                                                       {imagesUploading && <LinearProgress sx={{ mt: 1 }} />}
                                                  </Stack>
                                                  {/* Documents Section */}
                                                  <Divider sx={{ my: 2 }} />
                                                  <Stack spacing={1}>
                                                       <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} spacing={{ xs: 1.5, sm: 2 }}>
                                                            <Button variant="outlined" component="label" disabled={!editingEntity || docsUploading || !isDraft} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                                                                 {docsUploading ? t(tokens.announcements.form.uploading) : t(tokens.announcements.form.uploadDocuments || 'Upload documents')}
                                                                 <input type="file" hidden multiple onChange={handleDocumentsUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.odt,.ods,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.oasis.opendocument.text,application/vnd.oasis.opendocument.spreadsheet,application/zip" />
                                                            </Button>
                                                            <Button color="error" disabled={!editingEntity?.id || currentDocuments.length === 0 || inputsDisabled} onClick={handleRemoveAllDocuments} sx={{ width: { xs: '100%', sm: 'auto' } }}>{t(tokens.announcements.form.removeAllDocuments || 'Remove all documents')}</Button>
                                                            <Typography variant="caption" color="text.secondary" sx={{ width: { xs: '100%', sm: 'auto' } }}>{t(tokens.announcements.form.documentsCount || 'Documents: {{count}}', { count: currentDocuments.length })}</Typography>
                                                       </Stack>
                                                       {currentDocuments.length > 0 && (
                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                                 {currentDocuments.map((doc: any) => (
                                                                      <Box key={doc.url} sx={{ position: 'relative', width: 140, p: 1, borderRadius: 1, border: theme => `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                           <Typography variant="caption" noWrap title={doc.name} sx={{ flexGrow: 1 }}>{doc.name}</Typography>
                                                                           <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                                                                                <Button size="small" variant="text" onClick={() => window.open(doc.url, '_blank')}>{t(tokens.common.btnDownload)}</Button>
                                                                                {isDraft && (
                                                                                     <IconButton size="small" onClick={() => handleRemoveDocument(doc.url)}><DeleteIcon fontSize="inherit" /></IconButton>
                                                                                )}
                                                                           </Stack>
                                                                      </Box>
                                                                 ))}
                                                            </Box>
                                                       )}
                                                       {docsUploading && <LinearProgress sx={{ mt: 1 }} />}
                                                  </Stack>
                                                  <Divider sx={{ my: 1 }} />
                                                  {/* Pin / Schedule + Date Time pickers: make layout fluid with wrap */}
                                                  <Stack
                                                       direction="row"
                                                       alignItems="flex-start"
                                                       flexWrap="wrap"
                                                       gap={2}
                                                       sx={{ opacity: inputsDisabled ? 0.6 : 1, minWidth: 0 }}
                                                  >
                                                       <FormControlLabel
                                                            sx={{ flexShrink: 0, mb: 1 }} // same bottom space as pickers
                                                            disabled={inputsDisabled}
                                                            control={
                                                                 <Checkbox
                                                                      checked={formik.values.pinned}
                                                                      onChange={e => formik.setFieldValue('pinned', e.target.checked)}
                                                                 />
                                                            }
                                                            label={t(tokens.announcements.form.pinToTop)}
                                                       />

                                                       <FormControlLabel
                                                            sx={{ flexShrink: 0, mb: 1 }}
                                                            disabled={inputsDisabled}
                                                            control={
                                                                 <Checkbox
                                                                      checked={formik.values.schedule_enabled}
                                                                      onChange={e => {
                                                                           const enabled = e.target.checked;
                                                                           formik.setFieldValue('schedule_enabled', enabled);
                                                                           if (!enabled) {
                                                                                setScheduledDate(null);
                                                                                setScheduledTime(null);
                                                                                formik.setFieldValue('scheduled_at', null);
                                                                                formik.setFieldValue('scheduled_timezone', null);
                                                                           } else if (!scheduledDate) {
                                                                                const now = dayjs();
                                                                                const minute = now.minute();
                                                                                const rounded =
                                                                                     minute % 15 === 0 ? now : now.add(15 - (minute % 15), 'minute');
                                                                                setScheduledDate(rounded.startOf('day'));
                                                                                setScheduledTime(rounded);
                                                                                formik.setFieldValue('scheduled_at', rounded.format('YYYY-MM-DDTHH:mm:ss'));
                                                                                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
                                                                                formik.setFieldValue('scheduled_timezone', tz);
                                                                           }
                                                                      }}
                                                                 />
                                                            }
                                                            label={t(tokens.announcements.form.schedule)}
                                                       />

                                                       {formik.values.schedule_enabled && (
                                                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                                 <Box
                                                                      sx={{
                                                                           display: 'grid',
                                                                           gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit,minmax(140px,1fr))' },
                                                                           gap: 1.5,
                                                                           flexGrow: 1,
                                                                           minWidth: 0,
                                                                      }}
                                                                 >
                                                                      <Box sx={{ minWidth: 0 }}>
                                                                           <DatePicker
                                                                                label={t(tokens.announcements.form.scheduleAt) + ' (Date)'}
                                                                                value={scheduledDate}
                                                                                onChange={(newDate) => {
                                                                                     setScheduledDate(newDate);
                                                                                     const local = composeScheduledLocal(newDate, scheduledTime);
                                                                                     formik.setFieldValue('scheduled_at', local);
                                                                                }}
                                                                                disablePast
                                                                                slotProps={{
                                                                                     textField: {
                                                                                          name: 'scheduled_date',
                                                                                          fullWidth: true,
                                                                                          size: 'small',
                                                                                          helperText: ' ',
                                                                                          FormHelperTextProps: { sx: { minHeight: 20, mt: 0.5 } },
                                                                                          sx: { mb: 1 }, // equalize with checkboxes
                                                                                     },
                                                                                }}
                                                                           />
                                                                      </Box>

                                                                      <Box sx={{ minWidth: 0 }}>
                                                                           <TimePicker
                                                                                label={t(tokens.announcements.form.scheduleAt) + ' (Time)'}
                                                                                value={scheduledTime}
                                                                                onChange={(newTime) => {
                                                                                     setScheduledTime(newTime);
                                                                                     const local = composeScheduledLocal(scheduledDate, newTime);
                                                                                     formik.setFieldValue('scheduled_at', local);
                                                                                }}
                                                                                minutesStep={5}
                                                                                slotProps={{
                                                                                     textField: {
                                                                                          name: 'scheduled_at',
                                                                                          fullWidth: true,
                                                                                          size: 'small',
                                                                                          error: !!(formik.touched.scheduled_at && formik.errors.scheduled_at),
                                                                                          helperText:
                                                                                               formik.touched.scheduled_at && formik.errors.scheduled_at
                                                                                                    ? formik.errors.scheduled_at
                                                                                                    : ' ',
                                                                                          FormHelperTextProps: { sx: { minHeight: 20, mt: 0.5 } },
                                                                                          sx: { mb: 1 },
                                                                                     },
                                                                                     popper: {
                                                                                          sx: { '& .MuiPaper-root': { width: { xs: 220, sm: 260 }, p: 1 } },
                                                                                     },
                                                                                }}
                                                                           />
                                                                      </Box>
                                                                 </Box>
                                                            </LocalizationProvider>
                                                       )}
                                                  </Stack>
                                             </Stack>
                                        </Box>
                                        <Divider sx={{ my: 1 }} />
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end" alignItems={{ xs: 'stretch', sm: 'center' }}>
                                             <Tooltip
                                                  title={
                                                       !formik.isValid
                                                            ? (
                                                                 <Stack component="ol" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                                                                      {Object.entries(formik.errors)
                                                                           .filter(([key]) => key !== 'client_id')
                                                                           .map(([, err], idx) => {
                                                                                const items = typeof err === 'string' ? [err] : Object.values(err as any);
                                                                                return items.filter(Boolean).map((msg, innerIdx) => (
                                                                                     <Typography component="li" key={`${idx}-${innerIdx}`} variant="caption">
                                                                                          {msg as string}
                                                                                     </Typography>
                                                                                ));
                                                                           })
                                                                           .flat()}
                                                                 </Stack>
                                                            )
                                                            : ''
                                                  }
                                             >
                                                  <span>
                                                       <Button
                                                            variant="outlined"
                                                            onClick={handleSave}
                                                            disabled={!canSaveDraft}
                                                            loading={formik.isSubmitting}
                                                            sx={{ width: { xs: '100%', sm: 'auto' } }}
                                                       >
                                                            {formik.values.status === 'published' ? t(tokens.common.btnSave) : t(tokens.announcements.actions.saveDraft)}
                                                       </Button>
                                                  </span>
                                             </Tooltip>
                                             {formik.values.status === 'published' ? (
                                                  <Button
                                                       variant="contained"
                                                       color="primary"
                                                       onClick={handleUnpublish}
                                                       disabled={!editingEntity?.id || rowBusy === editingEntity?.id}
                                                       loading={formik.isSubmitting}
                                                       sx={{ width: { xs: '100%', sm: 'auto' } }}
                                                  >
                                                       {t(tokens.announcements.actions.unpublish)}
                                                  </Button>
                                             ) : (
                                                  <Button
                                                       variant="contained"
                                                       onClick={handlePublishClick}
                                                       disabled={!editingEntity?.id || !!formik.errors.title || !!formik.errors.message || !!formik.errors.category || !!formik.errors.subcategory}
                                                       loading={formik.isSubmitting}>
                                                       {t(tokens.announcements.actions.publish)}
                                                  </Button>
                                             )}
                                        </Stack>
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
               {
                    modalState?.type === 'confirm-publish' && (
                         <PopupModal
                              isOpen
                              onClose={() => setModalState(null)}
                              onConfirm={async () => {
                                   if (modalState.targetId) await handlePublish();
                                   setModalState(null);
                              }}
                              title={t(tokens.announcements.modals.publishTitle)}
                              type="confirmation"
                              confirmText={t(tokens.common.btnConfirm)}
                              cancelText={t(tokens.common.btnCancel)}
                         >
                              {t(tokens.announcements.modals.publishMessage)}
                         </PopupModal>
                    )
               }
          </Container>

     );
}
