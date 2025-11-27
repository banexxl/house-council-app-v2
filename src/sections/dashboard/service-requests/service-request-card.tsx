import type { FC } from 'react';
import { format } from 'date-fns';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import SvgIcon from '@mui/material/SvgIcon';
import AlertTriangleIcon from '@untitled-ui/icons-react/build/esm/AlertTriangle';

import { RouterLink } from 'src/components/router-link';
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

interface ServiceRequestCardProps {
  incident: IncidentReport;
  href: string;
}

export const ServiceRequestCard: FC<ServiceRequestCardProps> = ({ incident, href }) => {
  const createdAt = incident.created_at ? format(new Date(incident.created_at), 'MMM dd, yyyy') : '-';
  const statusLabel = incident.status.replace(/_/g, ' ');
  const priorityLabel = incident.priority.charAt(0).toUpperCase() + incident.priority.slice(1);

  return (
    <Card
      component={RouterLink}
      href={href}
      sx={{ textDecoration: 'none', height: '100%' }}
      variant="outlined"
    >
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip label={`Status: ${statusLabel}`} color={statusColor[incident.status]} size="small" />
            <Chip label={`Priority: ${priorityLabel}`} color={priorityColor[incident.priority]} size="small" />
            {incident.is_emergency && (
              <Chip
                color="error"
                icon={
                  <SvgIcon fontSize="small">
                    <AlertTriangleIcon />
                  </SvgIcon>
                }
                label="Emergency"
                size="small"
              />
            )}
          </Stack>
          <Typography variant="h6" noWrap>
            {incident.title}
          </Typography>
          <Typography
            color="text.secondary"
            variant="body2"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {incident.description}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label={incident.category.replace(/_/g, ' ')} size="small" variant="outlined" />
            {incident.building_id && (
              <Chip label={`Building: ${incident.building_id}`} size="small" variant="outlined" />
            )}
            {incident.apartment_id && (
              <Chip label={`Apartment: ${incident.apartment_id}`} size="small" variant="outlined" />
            )}
          </Stack>
          <Typography color="text.secondary" variant="caption">
            Created {createdAt}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};
