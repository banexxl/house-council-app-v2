'use client';

import { useCallback, useMemo, useState } from 'react';
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

export const IncidentCreateClient = () => {
  const [form, setForm] = useState<Omit<IncidentReport, 'id' | 'created_at' | 'updated_at'>>({
    client_id: '',
    building_id: '',
    apartment_id: '',
    created_by_profile_id: '',
    created_by_tenant_id: '',
    assigned_to_profile_id: '',
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
              Incidents
            </Link>
            <Typography
              color="text.secondary"
              variant="subtitle2"
            >
              Create
            </Typography>
          </Breadcrumbs>
        </Stack>
        <Card sx={{ mt: 6 }}>
          <CardContent>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 8 }}>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Title"
                    value={form.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                  />
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    label="Description"
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                  />
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Switch
                      checked={form.is_emergency}
                      onChange={(e) => handleChange('is_emergency', e.target.checked)}
                    />
                    <Typography>Mark as emergency</Typography>
                  </Stack>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Client ID"
                    value={form.client_id}
                    onChange={(e) => handleChange('client_id', e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Building ID"
                    value={form.building_id}
                    onChange={(e) => handleChange('building_id', e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Apartment ID (optional)"
                    value={form.apartment_id ?? ''}
                    onChange={(e) => handleChange('apartment_id', e.target.value)}
                  />
                  <TextField
                    fullWidth
                    label="Reporter Profile ID"
                    value={form.created_by_profile_id}
                    onChange={(e) => handleChange('created_by_profile_id', e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Reporter Tenant ID (optional)"
                    value={form.created_by_tenant_id ?? ''}
                    onChange={(e) => handleChange('created_by_tenant_id', e.target.value)}
                  />
                  <TextField
                    fullWidth
                    label="Assignee Profile ID (optional)"
                    value={form.assigned_to_profile_id ?? ''}
                    onChange={(e) => handleChange('assigned_to_profile_id', e.target.value)}
                  />
                  <TextField
                    select
                    fullWidth
                    label="Category"
                    value={form.category}
                    onChange={(e) => handleChange('category', e.target.value as IncidentCategory)}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category.replace(/_/g, ' ')}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    fullWidth
                    label="Priority"
                    value={form.priority}
                    onChange={(e) => handleChange('priority', e.target.value as IncidentPriority)}
                  >
                    {priorities.map((priority) => (
                      <MenuItem key={priority} value={priority}>
                        {priority}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    fullWidth
                    label="Status"
                    value={form.status}
                    onChange={(e) => handleChange('status', e.target.value as IncidentStatus)}
                  >
                    {statuses.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status.replace(/_/g, ' ')}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Stack direction="row" spacing={2}>
                    <Button
                      fullWidth
                      color="inherit"
                      disabled={submitting}
                      onClick={() => setForm((prev) => ({ ...prev, title: '', description: '' }))}
                    >
                      Reset
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSubmit}
                      disabled={!isValid || submitting}
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
