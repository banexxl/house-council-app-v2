'use client';

import type { FC } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import ArrowLeftIcon from '@untitled-ui/icons-react/build/esm/ArrowLeft';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { createIncidentReport, updateIncidentReport } from 'src/app/actions/incident/incident-report-actions';
import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import type { IncidentReport, IncidentCategory, IncidentPriority, IncidentStatus } from 'src/types/incident-report';
import {
  INCIDENT_CATEGORY_TOKENS,
  INCIDENT_PRIORITY_TOKENS,
  INCIDENT_STATUS_TOKENS,
} from 'src/types/incident-report';
import { useTranslation } from 'react-i18next';
import { FileDropzone, type File as DropFile, type DBStoredImage } from 'src/components/file-dropzone';
import { uploadEntityFiles, removeEntityFile } from 'src/libs/supabase/sb-storage';
import { useTheme } from '@mui/material';
import { EntityFormHeader, type BreadcrumbItem } from 'src/components/entity-form-header';

interface IncidentCreateProps {
  incident?: IncidentReport;
  defaultClientId?: string | null;
  defaultBuildingId?: string | null;
  defaultApartmentId?: string | null;
  defaultTenantId?: string | null;
  defaultReporterProfileId?: string | null; // retained for compatibility, not used
  defaultReporterId?: string | null;
  defaultReporterName?: string | null;
  defaultAssigneeProfileId?: string | null;
  buildingOptions?: Array<{
    id: string;
    label: string;
    apartments: { id: string; apartment_number: string }[];
  }> | null;
  assigneeOptions?: Array<{
    id: string;
    label: string;
    buildingId?: string | null;
  }> | null;
}

const categories: IncidentCategory[] = [
  'plumbing',
  'electrical',
  'noise',
  'cleaning',
  'common_area',
  'heating',
  'cooling',
  'structural',
  'interior',
  'outdoorsafety',
  'security',
  'pests',
  'administrative',
  'parking',
  'it',
  'waste',
];

const priorities: IncidentPriority[] = ['low', 'medium', 'high', 'urgent'];
const statuses: IncidentStatus[] = ['open', 'in_progress', 'on_hold', 'resolved', 'closed', 'cancelled'];

export const IncidentCreate: FC<IncidentCreateProps> = ({
  incident,
  defaultClientId,
  defaultBuildingId,
  defaultApartmentId,
  defaultReporterId,
  defaultReporterName,
  defaultAssigneeProfileId,
  buildingOptions,
  assigneeOptions,
}) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [status, setStatus] = useState<{ success?: string; error?: string }>({});
  const [incidentId, setIncidentId] = useState<string | null>(incident?.id ?? null);
  const [incidentImages, setIncidentImages] = useState<DBStoredImage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined);
  const theme = useTheme();
  const [isHeaderNavigating, setIsHeaderNavigating] = useState(false);
  const [isHeaderCreating, setIsHeaderCreating] = useState(false);

  const breadcrumbs: BreadcrumbItem[] = [
    {
      title: t('nav.dashboard', 'Dashboard'),
      href: paths.dashboard.index,
    },
    {
      title: t('incident.incidentReports', 'Incident reports'),
      href: paths.dashboard.serviceRequests.index,
    },
    {
      title: incident
        ? t('incident.incidentReportEdit', 'Edit incident')
        : t('incident.incidentReportCreate', 'Create incident'),
    },
  ];

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      client_id: incident?.client_id ?? defaultClientId ?? '',
      building_id: incident?.building_id ?? defaultBuildingId ?? '',
      apartment_id: incident?.apartment_id ?? defaultApartmentId ?? '',
      reported_by: incident?.reported_by ?? defaultReporterId ?? '',
      assigned_to: incident?.assigned_to ?? defaultAssigneeProfileId ?? '',
      title: incident?.title ?? '',
      description: incident?.description ?? '',
      category: (incident?.category ?? 'plumbing') as IncidentCategory,
      priority: (incident?.priority ?? 'medium') as IncidentPriority,
      status: (incident?.status ?? 'open') as IncidentStatus,
      is_emergency: incident?.is_emergency ?? false,
    },
    validationSchema: Yup.object({
      client_id: Yup.string().trim().required('Client is required'),
      building_id: Yup.string().trim().required('Building is required'),
      reported_by: Yup.string().trim().required('Reporter is required'),
      title: Yup.string().trim().required('Title is required'),
      description: Yup.string().trim().required('Description is required'),
      category: Yup.string().required('Category is required'),
      priority: Yup.string().required('Priority is required'),
      status: Yup.string().required('Status is required'),
    }),
    onSubmit: async (values) => {
      setStatus({});
      try {
        const payload = {
          ...values,
          apartment_id: values.apartment_id || null,
          assigned_to: values.assigned_to || null,
        };
        const res = incident
          ? await updateIncidentReport(incident.id, payload)
          : await createIncidentReport(payload, i18n.language);

        if (!res.success || !res.data) {
          setStatus({ error: res.error || 'Failed to save incident' });
          toast.error(res.error || 'Failed to save incident');
          return;
        }

        const successMsg = incident
          ? t('incident.form.updated', 'Incident updated')
          : t('incident.form.created', 'Incident created');

        toast.success(successMsg);
        setStatus({ success: successMsg });
        const idToView = incident?.id || res.data.id;
        if (!incident && idToView) {
          router.push(`${paths.dashboard.serviceRequests.index}/${idToView}`);
        }
        setIncidentId(idToView || null);
      } catch (err: any) {
        setStatus({ error: err?.message || 'Failed to save incident' });
        toast.error(err?.message || 'Failed to save incident');
      }
    },
  });

  const availableApartments = useMemo(() => {
    if (!buildingOptions?.length || !formik.values.building_id) return [];
    return buildingOptions.find((b) => b.id === formik.values.building_id)?.apartments ?? [];
  }, [buildingOptions, formik.values.building_id]);

  const availableAssignees = useMemo(() => {
    if (!assigneeOptions?.length) return [];
    if (!formik.values.building_id) return assigneeOptions;
    return assigneeOptions.filter((opt) => !opt.buildingId || opt.buildingId === formik.values.building_id);
  }, [assigneeOptions, formik.values.building_id]);

  const handleFilesDrop = useCallback(
    async (files: DropFile[]) => {
      if (!incidentId) {
        toast.error(t('common.actionSaveFirst', 'Save the incident before uploading files'));
        return;
      }
      if (!formik.values.building_id) {
        toast.error(t('incident.form.building', 'Building is required'));
        return;
      }
      if (!files.length) return;

      let fakeProgress = 0;
      setUploadProgress(0);
      const interval = setInterval(() => {
        fakeProgress += 8;
        if (fakeProgress <= 95) setUploadProgress(fakeProgress);
      }, 250);

      try {
        const uploadRes = await uploadEntityFiles({
          entity: 'incident-image',
          entityId: incidentId,
          files: files as unknown as File[],
          clientId: formik.values.client_id,
          buildingId: formik.values.building_id,
          apartmentId: formik.values.apartment_id || null,
        });
        clearInterval(interval);
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(undefined), 500);

        if (!uploadRes.success || !uploadRes.records?.length) {
          toast.error(uploadRes.error || t('common.actionUploadError', 'Upload failed'));
          return;
        }

        setIncidentImages((prev) => [...prev, ...(uploadRes.records as unknown as DBStoredImage[])]);
        toast.success(t('common.actionUploadSuccess', 'Uploaded successfully'));
      } catch (err) {
        clearInterval(interval);
        setUploadProgress(undefined);
        toast.error(t('common.actionUploadError', 'Upload failed'));
      }
    },
    [incidentId, formik.values.client_id, formik.values.building_id, formik.values.apartment_id, t]
  );

  const handleRemoveImage = useCallback(
    async (image: DBStoredImage) => {
      if (!incidentId) return;
      const result = await removeEntityFile({
        entity: 'incident-image',
        entityId: incidentId,
        storagePathOrUrl: image.storage_path,
      });
      if (!result.success) {
        toast.error(result.error || t('common.actionDeleteError', 'Failed to delete'));
        return;
      }
      setIncidentImages((prev) => prev.filter((img) => img.id !== image.id));
      toast.success(t('common.actionDeleteSuccess', 'Deleted'));
    },
    [incidentId, t]
  );

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        py: 8,
      }}
    >
      <Container maxWidth="xl">
        <EntityFormHeader
          backHref={paths.dashboard.serviceRequests.index}
          backLabel={t('common.btnBack', 'Back to list')}
          title={
            incident
              ? t('incident.incidentReportEdit', 'Edit incident')
              : t('incident.incidentReportCreate', 'Create incident')
          }
          breadcrumbs={breadcrumbs}
          showNotificationAlert={false}
          actionComponent={
            incident?.id ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Button
                  variant="contained"
                  href={paths.dashboard.serviceRequests.index}
                  onClick={() => setIsHeaderNavigating(true)}
                  disabled={isHeaderNavigating || isHeaderCreating}
                  startIcon={isHeaderNavigating ? <CircularProgress size={16} color="inherit" /> : undefined}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  {t('incident.incidentReports', 'Incident reports')}
                </Button>
                <Button
                  variant="outlined"
                  href={paths.dashboard.serviceRequests.create}
                  onClick={() => setIsHeaderCreating(true)}
                  disabled={isHeaderNavigating || isHeaderCreating}
                  startIcon={isHeaderCreating ? <CircularProgress size={16} color="inherit" /> : undefined}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  {t('incident.incidentReportCreate', 'Create incident')}
                </Button>
              </Stack>
            ) : (
              <Button
                variant="contained"
                href={paths.dashboard.serviceRequests.index}
                onClick={() => setIsHeaderNavigating(true)}
                disabled={isHeaderNavigating}
                startIcon={isHeaderNavigating ? <CircularProgress size={16} color="inherit" /> : undefined}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {t('incident.incidentReports', 'Incident reports')}
              </Button>
            )
          }
        />

        <Card>
          <CardContent>
            <form onSubmit={formik.handleSubmit}>
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Stack spacing={3}>
                    {status.error && <Alert severity="error">{status.error}</Alert>}
                    {status.success && <Alert severity="success">{status.success}</Alert>}
                    <TextField
                      fullWidth
                      label={t('incident.form.title', 'Title')}
                      name="title"
                      value={formik.values.title}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.title && Boolean(formik.errors.title)}
                      helperText={formik.touched.title && formik.errors.title}
                    />
                    <TextField
                      fullWidth
                      multiline
                      minRows={4}
                      label={t('incident.form.description', 'Description')}
                      name="description"
                      value={formik.values.description}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.description && Boolean(formik.errors.description)}
                      helperText={formik.touched.description && formik.errors.description}
                    />
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Checkbox
                        checked={formik.values.is_emergency}
                        name="is_emergency"
                        onChange={formik.handleChange}
                      />
                      <Typography>{t('incident.form.emergency', 'Mark as emergency')}</Typography>
                    </Stack>

                    <Stack spacing={1}>
                      <Typography variant="subtitle2">{t('common.lblUploadedImages', 'Uploaded images')}</Typography>
                      {!incidentId && (
                        <Typography variant="caption" color={theme.palette.error.main}>
                          {t('common.actionSaveFirst', 'Save the incident before uploading')}
                        </Typography>
                      )}
                      <FileDropzone
                        accept={{ 'image/*': [] }}
                        images={incidentImages}
                        uploadProgress={uploadProgress}
                        onRemoveImage={handleRemoveImage}
                        onDropAccepted={handleFilesDrop}
                        disabled={!incidentId || !formik.values.building_id}
                      />
                    </Stack>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stack spacing={3}>
                    <TextField
                      select
                      fullWidth
                      label={t('incident.form.building', 'Building')}
                      name="building_id"
                      value={formik.values.building_id}
                      onChange={(e) => {
                        formik.handleChange(e);
                        formik.setFieldValue('apartment_id', '');
                      }}
                      onBlur={formik.handleBlur}
                      required
                      error={formik.touched.building_id && Boolean(formik.errors.building_id)}
                      helperText={formik.touched.building_id && formik.errors.building_id}
                    >
                      {(buildingOptions ?? []).map((option) => (
                        <MenuItem key={option.id} value={option.id}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      select
                      fullWidth
                      label={t('incident.form.apartment', 'Apartment')}
                      name="apartment_id"
                      value={formik.values.apartment_id ?? ''}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      disabled={!availableApartments.length}
                    >
                      <MenuItem value="">None</MenuItem>
                      {availableApartments.map((apt) => (
                        <MenuItem key={apt.id} value={apt.id}>
                          {apt.apartment_number || apt.id}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      fullWidth
                      label={t('incident.form.reporter', 'Reporter')}
                      value={defaultReporterName || formik.values.reported_by || defaultReporterId || ''}
                      disabled
                      error={formik.touched.reported_by && Boolean(formik.errors.reported_by)}
                      helperText={formik.touched.reported_by && formik.errors.reported_by}
                    />
                    <input type="hidden" name="reported_by" value={formik.values.reported_by} />

                    <TextField
                      select
                      fullWidth
                      label={t('incident.form.assignee', 'Assignee')}
                      name="assigned_to"
                      value={formik.values.assigned_to ?? ''}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    >
                      <MenuItem value="">Unassigned</MenuItem>
                      {availableAssignees.map((option) => (
                        <MenuItem key={option.id} value={option.id}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      select
                      fullWidth
                      label={t('incident.form.category', 'Category')}
                      name="category"
                      value={formik.values.category}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                    >
                      {categories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {t(INCIDENT_CATEGORY_TOKENS[category], category)}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      select
                      fullWidth
                      label={t('incident.form.priority', 'Priority')}
                      name="priority"
                      value={formik.values.priority}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                    >
                      {priorities.map((priority) => (
                        <MenuItem key={priority} value={priority}>
                          {t(INCIDENT_PRIORITY_TOKENS[priority], priority)}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      select
                      fullWidth
                      label={t('incident.form.status', 'Status')}
                      name="status"
                      value={formik.values.status}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                    >
                      {statuses.map((status) => (
                        <MenuItem key={status} value={status}>
                          {t(INCIDENT_STATUS_TOKENS[status], status)}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                </Grid>
              </Grid>

              <Stack direction="row" spacing={2} justifyContent="flex-end" mt={4}>
                <Button
                  color="inherit"
                  component={RouterLink}
                  href={paths.dashboard.serviceRequests.index}
                  startIcon={
                    <SvgIcon fontSize="small">
                      <ArrowLeftIcon />
                    </SvgIcon>
                  }
                >
                  {t('common.btnBack', 'Back to list')}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={formik.isSubmitting || !formik.dirty}
                >
                  {formik.isSubmitting
                    ? t('common.btnSaving', 'Saving...')
                    : incident
                      ? t('incident.form.submitUpdate', 'Update incident')
                      : t('incident.form.submit', 'Create incident')}
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};
