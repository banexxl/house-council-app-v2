import type { FC } from 'react';
import { format } from 'date-fns';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import SvgIcon from '@mui/material/SvgIcon';
import AlertTriangleIcon from '@untitled-ui/icons-react/build/esm/AlertTriangle';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const createdAt = incident.created_at ? format(new Date(incident.created_at), 'MMM dd, yyyy') : '-';
  const statusLabel = t(`incident.status.${incident.status}`, incident.status.replace(/_/g, ' '));
  const priorityLabel = t(`incident.priority.${incident.priority}`, incident.priority.charAt(0).toUpperCase() + incident.priority.slice(1));
  const categoryLabel = t(`incident.category.${incident.category}`, incident.category.replace(/_/g, ' '));
  const buildingLabel = (incident as any).building_label || incident.building_id;
  const apartmentLabel = (incident as any).apartment_number || incident.apartment_id;

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
            <Chip label={`${t('incident.form.status', 'Status')}: ${statusLabel}`} color={statusColor[incident.status]} size="small" />
            <Chip label={`${t('incident.form.priority', 'Priority')}: ${priorityLabel}`} color={priorityColor[incident.priority]} size="small" />
            {incident.is_emergency && (
              <Chip
                color="error"
                icon={
                  <SvgIcon fontSize="small">
                    <AlertTriangleIcon />
                  </SvgIcon>
                }
                label={t('incident.form.emergency', 'Mark as emergency')}
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
            <Chip label={categoryLabel} size="small" variant="outlined" />
            {buildingLabel && (
              <Chip label={`${t('incident.form.building', 'Building')}: ${buildingLabel}`} size="small" variant="outlined" />
            )}
            {apartmentLabel && (
              <Chip label={`${t('incident.form.apartment', 'Apartment')}: ${apartmentLabel}`} size="small" variant="outlined" />
            )}
          </Stack>
          <Typography color="text.secondary" variant="caption">
            {t('incident.createdAt', 'Created {{date}}', { date: createdAt })}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};
