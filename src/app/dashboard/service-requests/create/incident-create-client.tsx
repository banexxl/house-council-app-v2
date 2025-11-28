'use client';

import type { FC } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import toast from 'react-hot-toast';

import { createIncidentReport } from 'src/app/actions/incident/incident-report-actions';
import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import type {
  IncidentCategory,
  IncidentPriority,
  IncidentReport,
  IncidentStatus,
} from 'src/types/incident-report';
import {
  INCIDENT_CATEGORY_TOKENS,
  INCIDENT_PRIORITY_TOKENS,
  INCIDENT_STATUS_TOKENS,
} from 'src/types/incident-report';
import { tokens } from 'src/locales/tokens';

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

interface IncidentCreateClientProps {
  defaultClientId?: string;
  defaultBuildingId?: string;
  defaultApartmentId?: string | null;
  defaultTenantId?: string | null;
  defaultReporterProfileId?: string;
  defaultAssigneeProfileId?: string;
  buildingOptions?: Array<{ id: string; label: string; apartments: { id: string; apartment_number: string }[] }>;
  assigneeOptions?: Array<{ id: string; label: string; buildingId?: string | null }>;
}

export const IncidentCreateClient: FC<IncidentCreateClientProps> = ({
  defaultClientId,
  defaultBuildingId,
  defaultApartmentId,
  defaultTenantId,
  defaultReporterProfileId,
  defaultAssigneeProfileId,
  buildingOptions,
  assigneeOptions,
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<Omit<IncidentReport, 'id' | 'created_at' | 'updated_at'>>({
    client_id: defaultClientId ?? '',
    building_id: defaultBuildingId ?? '',
    apartment_id: defaultApartmentId ?? '',
    created_by_profile_id: defaultReporterProfileId ?? '',
    created_by_tenant_id: defaultTenantId ?? '',
    assigned_to_profile_id: defaultAssigneeProfileId ?? '',
    title: '',
    description: '',
    category: 'plumbing',
    priority: 'medium',
    status: 'open',
    is_emergency: false,
    resolved_at: null,
    closed_at: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const hasBuildingChoice = Boolean(buildingOptions?.length);
  const shouldDisableFields = hasBuildingChoice && !form.building_id;
  const availableApartments = useMemo(() => {
    return buildingOptions?.find((b) => b.id === form.building_id)?.apartments ?? [];
  }, [buildingOptions, form.building_id]);
  const availableAssignees = useMemo(() => {
    if (!assigneeOptions) return [];
    return assigneeOptions.filter((option) => !option.buildingId || option.buildingId === form.building_id);
  }, [assigneeOptions, form.building_id]);

  const missingContext = !form.client_id || !form.building_id;
  const isValid = useMemo(() => {
    return (
      form.client_id.trim() &&
      form.building_id.trim() &&
      form.created_by_profile_id.trim() &&
      form.title.trim() &&
      form.description.trim()
    );
  }, [form]);

  const handleChange = useCallback(
    (field: keyof typeof form, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );
  const handleBuildingChange = useCallback(
    (value: string) => {
      setForm((prev) => ({ ...prev, building_id: value, apartment_id: '' }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!isValid) {
      toast.error('Please fill required fields');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        apartment_id: form.apartment_id || null,
        created_by_tenant_id: form.created_by_tenant_id || null,
        assigned_to_profile_id: form.assigned_to_profile_id || null,
      };
      const res = await createIncidentReport(payload);
      if (!res.success) {
        toast.error(res.error || 'Failed to create incident');
      } else {
        toast.success('Incident created');
        setForm((prev) => ({
          ...prev,
          title: '',
          description: '',
          is_emergency: false,
          status: 'open',
        }));
      }
    } catch (err) {
      toast.error('Failed to create incident');
    } finally {
      setSubmitting(false);
    }
  }, [form, isValid]);

  const handleReset = useCallback(() => {
    setForm({
      client_id: defaultClientId ?? '',
      building_id: defaultBuildingId ?? '',
      apartment_id: defaultApartmentId ?? '',
      created_by_profile_id: defaultReporterProfileId ?? '',
      created_by_tenant_id: defaultTenantId ?? '',
      assigned_to_profile_id: defaultAssigneeProfileId ?? '',
      title: '',
      description: '',
      category: 'plumbing',
      priority: 'medium',
      status: 'open',
      is_emergency: false,
      resolved_at: null,
      closed_at: null,
    });
  }, [
    defaultApartmentId,
    defaultAssigneeProfileId,
    defaultBuildingId,
    defaultClientId,
    defaultReporterProfileId,
    defaultTenantId,
  ]);

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        py: 8,
      }}
    >
      <Container maxWidth="xl">
        <Stack spacing={1}>
            <Typography variant="h3">Report incident</Typography>
            <Breadcrumbs separator={<KeyboardArrowRightIcon />}>
              <Link
                color="text.primary"
                component={RouterLink}
                href={paths.dashboard.index}
                variant="subtitle2"
              >
                Dashboard
              </Link>
              <Link
                color="text.primary"
                component={RouterLink}
                href={paths.dashboard.serviceRequests.index}
                variant="subtitle2"
              >
                {t(tokens.incident.formSubmit)}
              </Link>
              <Typography
                color="text.secondary"
                variant="subtitle2"
              >
                {t(tokens.incident.formSubmit)}
              </Typography>
            </Breadcrumbs>
          </Stack>
        <Card sx={{ mt: 6 }}>
          <CardContent>
            {missingContext && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                We could not resolve your building and client automatically. Please reach out to support.
              </Alert>
            )}
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 8 }}>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label={t(tokens.incident.formTitle)}
                    value={form.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    disabled={shouldDisableFields}
                  />
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    label={t(tokens.incident.formDescription)}
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    disabled={shouldDisableFields}
                  />
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Switch
                      checked={form.is_emergency}
                      onChange={(e) => handleChange('is_emergency', e.target.checked)}
                      disabled={shouldDisableFields}
                    />
                    <Typography>{t(tokens.incident.formEmergency)}</Typography>
                  </Stack>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Stack spacing={3}>
                  {/* <input type="hidden" value={form.client_id} readOnly />
                  <input type="hidden" value={form.created_by_tenant_id ?? ''} readOnly /> */}
                  {hasBuildingChoice ? (
                    <TextField
                      select
                      fullWidth
                      label={t(tokens.incident.formBuilding)}
                      value={form.building_id}
                      onChange={(e) => handleBuildingChange(e.target.value)}
                      required
                    >
                      {buildingOptions!.map((option) => (
                        <MenuItem key={option.id} value={option.id}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <input type="hidden" value={form.building_id} readOnly />
                  )}
                  {hasBuildingChoice ? (
                    <TextField
                      select
                      fullWidth
                      label={t(tokens.incident.formApartment)}
                      value={form.apartment_id ?? ''}
                      onChange={(e) => handleChange('apartment_id', e.target.value)}
                      disabled={shouldDisableFields || !availableApartments.length}
                      helperText={
                        availableApartments.length
                          ? undefined
                          : t(tokens.incident.formApartment)
                      }
                    >
                      {availableApartments.map((apt) => (
                        <MenuItem key={apt.id} value={apt.id}>
                          {apt.apartment_number || apt.id}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <TextField
                      fullWidth
                      label={t(tokens.incident.formApartment)}
                      value={form.apartment_id ?? ''}
                      onChange={(e) => handleChange('apartment_id', e.target.value)}
                      disabled={shouldDisableFields}
                    />
                  )}
                  <TextField
                    fullWidth
                    label={t(tokens.incident.formReporter)}
                    value={form.created_by_profile_id}
                    onChange={(e) => handleChange('created_by_profile_id', e.target.value)}
                    required
                    disabled
                  />
                  <TextField
                    select={Boolean(availableAssignees.length)}
                    fullWidth
                    label={t(tokens.incident.formAssignee)}
                    value={form.assigned_to_profile_id ?? ''}
                    onChange={(e) => handleChange('assigned_to_profile_id', e.target.value)}
                    disabled={shouldDisableFields}
                  >
                    {availableAssignees.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    fullWidth
                    label={t(tokens.incident.formCategory)}
                    value={form.category}
                    onChange={(e) => handleChange('category', e.target.value as IncidentCategory)}
                    disabled={shouldDisableFields}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {t(INCIDENT_CATEGORY_TOKENS[category])}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    fullWidth
                    label={t(tokens.incident.formPriority)}
                    value={form.priority}
                    onChange={(e) => handleChange('priority', e.target.value as IncidentPriority)}
                    disabled={shouldDisableFields}
                  >
                    {priorities.map((priority) => (
                      <MenuItem key={priority} value={priority}>
                        {t(INCIDENT_PRIORITY_TOKENS[priority])}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    fullWidth
                    label={t(tokens.incident.formStatus)}
                    value={form.status}
                    onChange={(e) => handleChange('status', e.target.value as IncidentStatus)}
                    disabled={shouldDisableFields}
                  >
                    {statuses.map((status) => (
                      <MenuItem key={status} value={status}>
                        {t(INCIDENT_STATUS_TOKENS[status])}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Stack direction="row" spacing={2}>
                    <Button
                      fullWidth
                      color="inherit"
                      disabled={submitting || shouldDisableFields}
                      onClick={handleReset}
                    >
                      Reset
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSubmit}
                      disabled={!isValid || submitting || missingContext || shouldDisableFields}
                    >
                      {submitting ? 'Saving...' : 'Submit incident'}
                    </Button>
                  </Stack>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};
