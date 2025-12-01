'use client';

import type { FC } from 'react';
import { format } from 'date-fns';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import AlertTriangleIcon from '@untitled-ui/icons-react/build/esm/AlertTriangle';
import ArrowLeftIcon from '@untitled-ui/icons-react/build/esm/ArrowLeft';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import type { IncidentReport } from 'src/types/incident-report';

const statusColor: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | undefined> = {
  open: 'info',
  in_progress: 'warning',
  on_hold: 'default',
  resolved: 'success',
  closed: 'default',
  cancelled: 'default',
};

const priorityColor: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | undefined> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'error',
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'N/A';
  }
  return format(new Date(value), 'MMM dd, yyyy HH:mm');
};

interface IncidentCreateProps {
  incident?: IncidentReport;
  defaultClientId?: string | null;
  defaultBuildingId?: string | null;
  defaultApartmentId?: string | null;
  defaultTenantId?: string | null;
  defaultReporterProfileId?: string | null;
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

const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
  <Stack spacing={0.5}>
    <Typography color="text.secondary" variant="body2">
      {label}
    </Typography>
    <Typography variant="subtitle2">{value || 'N/A'}</Typography>
  </Stack>
);

export const IncidentCreate: FC<IncidentCreateProps> = ({
  incident,
  defaultClientId,
  defaultBuildingId,
  defaultApartmentId,
  defaultTenantId,
  defaultReporterProfileId,
  defaultReporterName,
  defaultAssigneeProfileId,
  buildingOptions,
  assigneeOptions,
}) => {
  const statusLabel = incident?.status.replace(/_/g, ' ') ?? '';
  const priorityLabel = incident && incident.priority
    ? incident.priority.charAt(0).toUpperCase() + incident.priority.slice(1)
    : '';

  // Currently these defaults/options are not used in the details view,
  // but they are accepted to match Page props and allow future form wiring.
  const _unused = {
    defaultClientId,
    defaultBuildingId,
    defaultApartmentId,
    defaultTenantId,
    defaultReporterProfileId,
    defaultReporterName,
    defaultAssigneeProfileId,
    buildingOptions,
    assigneeOptions,
  };

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        py: 8,
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={1}>
          <Typography variant="h3">Incident details</Typography>
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
              Incident reports
            </Link>
            <Typography
              color="text.secondary"
              variant="subtitle2"
            >
              Details
            </Typography>
          </Breadcrumbs>
        </Stack>
        <Card
          elevation={16}
          sx={{
            borderRadius: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 6,
            mb: 4,
            px: 3,
            py: 2,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip label={`Status: ${statusLabel}`} color={statusColor[incident?.status ?? 'open']} />
            <Chip label={`Priority: ${priorityLabel}`} color={priorityColor[incident?.priority ?? 'low']} />
            {incident?.is_emergency && (
              <Chip
                color="error"
                icon={
                  <SvgIcon>
                    <AlertTriangleIcon />
                  </SvgIcon>
                }
                label="Emergency"
              />
            )}
          </Stack>
          <Stack direction="row" spacing={1}>
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
              Back to list
            </Button>
            <Button
              component={RouterLink}
              href={paths.dashboard.serviceRequests.create}
              variant="contained"
            >
              Log new incident
            </Button>
          </Stack>
        </Card>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="overline" color="text.secondary">
                    Summary
                  </Typography>
                  <Typography variant="h4">{incident?.title ?? ''}</Typography>
                  <Typography color="text.secondary" variant="body1">
                    {incident?.description || 'No description provided.'}
                  </Typography>
                  <Divider />
                  <Stack direction="row" spacing={3} flexWrap="wrap">
                    <InfoRow label="Created" value={formatDate(incident?.created_at)} />
                    <InfoRow label="Last updated" value={formatDate(incident?.updated_at)} />
                    <InfoRow label="Resolved" value={formatDate(incident?.resolved_at)} />
                    <InfoRow label="Closed" value={formatDate(incident?.closed_at)} />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={2}>
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="overline" color="text.secondary">
                      Assignment
                    </Typography>
                    <InfoRow label="Reporter profile" value={incident?.created_by_profile_id} />
                    <InfoRow label="Reporter tenant" value={incident?.created_by_tenant_id} />
                    <InfoRow label="Assigned to profile" value={incident?.assigned_to_profile_id} />
                  </Stack>
                </CardContent>
              </Card>
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="overline" color="text.secondary">
                      Location
                    </Typography>
                    <InfoRow label="Client" value={incident?.client_id} />
                    <InfoRow label="Building" value={incident?.building_id} />
                    <InfoRow label="Apartment" value={incident?.apartment_id} />
                    <InfoRow label="Category" value={incident?.category.replace(/_/g, ' ') ?? undefined} />
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
