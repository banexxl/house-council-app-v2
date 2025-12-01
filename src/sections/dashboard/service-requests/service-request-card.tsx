import type { FC } from 'react';
import { format } from 'date-fns';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import SvgIcon from '@mui/material/SvgIcon';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import Tooltip from '@mui/material/Tooltip';
import { useTranslation } from 'react-i18next';

import { RouterLink } from 'src/components/router-link';
import type { IncidentReport } from 'src/types/incident-report';
import { Box, Button } from '@mui/material';

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
  onDelete?: () => void;
  deleting?: boolean;
}

export const ServiceRequestCard: FC<ServiceRequestCardProps> = ({ incident, href, onDelete, deleting }) => {
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
      sx={{
        textDecoration: 'none',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 3,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          transform: 'scale(1.01)',
          boxShadow: 6,
        },
      }}
      variant="outlined"
    >
      <CardContent sx={{ flexGrow: 1, display: 'flex', position: 'relative', pt: onDelete ? 5 : undefined }}>
        {onDelete && (
          <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              sx={{ minWidth: 0, p: 0.5, borderRadius: '50%' }}
              disabled={deleting}
            >
              <SvgIcon fontSize="small">
                <DeleteIcon />
              </SvgIcon>
            </Button>
          </Box>
        )}
        <Stack spacing={1.5} sx={{ width: '100%', height: '100%' }}>
          <Stack
            direction="column"
            spacing={0.5}
            alignItems="flex-start"
            sx={{ width: '100%' }}
          >
            <Chip label={`${t('incident.form.status', 'Status')}: ${statusLabel}`} color={statusColor[incident.status]} size="small" />
            <Chip label={`${t('incident.form.priority', 'Priority')}: ${priorityLabel}`} color={priorityColor[incident.priority]} size="small" />
            {incident.is_emergency && (
              <Chip
                color="error"
                icon={
                  <SvgIcon fontSize="small">
                    <DeleteIcon />
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
              flexGrow: 1,
            }}
          >
            {incident.description}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label={categoryLabel} size="small" variant="outlined" />
            {buildingLabel && (
              <Tooltip title={buildingLabel}>
                <Chip label={`${t('incident.form.building', 'Building')}: ${buildingLabel}`} size="small" variant="outlined" />
              </Tooltip>
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
