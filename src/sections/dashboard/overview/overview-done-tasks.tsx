import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import { useTranslation } from 'react-i18next';
import type { IncidentReport } from 'src/types/incident-report';
import { FC } from 'react';

interface OverviewDoneTasksProps {
  statusCounts: Record<IncidentReport['status'], number>;
}

const STATUS_META: Array<{ key: IncidentReport['status']; color: string; bg: string; fallback: string }> = [
  { key: 'open', color: 'info.main', bg: 'info.light', fallback: 'OP' },
  { key: 'in_progress', color: 'warning.main', bg: 'warning.light', fallback: 'IP' },
  { key: 'on_hold', color: 'default', bg: 'grey.100', fallback: 'OH' },
  { key: 'resolved', color: 'success.main', bg: 'success.light', fallback: 'RS' },
  { key: 'closed', color: 'text.secondary', bg: 'grey.100', fallback: 'CL' },
  { key: 'cancelled', color: 'error.main', bg: 'error.light', fallback: 'CN' },
];

export const OverviewDoneTasks: FC<OverviewDoneTasksProps> = ({ statusCounts }) => {
  const { t } = useTranslation();

  return (
    <Card sx={{ px: 3, py: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography color="text.secondary" variant="body2">
            {t('incident.overviewTitle', 'Service requests by status')}
          </Typography>
          <Typography color="text.primary" variant="h4">
            {Object.values(statusCounts || {}).reduce((sum, val) => sum + (val || 0), 0)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 1.5,
          }}
        >
          {STATUS_META.map(({ key, color, bg, fallback }) => (
            <Stack
              key={key}
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                px: 1.5,
                py: 1,
              }}
            >
              <Avatar
                sx={{
                  bgcolor: bg,
                  color: color,
                  width: 32,
                  height: 32,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {fallback}
              </Avatar>
              <Stack spacing={0.25}>
                <Typography variant="subtitle2">
                  {t(`incident.status.${key}`, key.replace(/_/g, ' '))}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {statusCounts?.[key] ?? 0}
                </Typography>
              </Stack>
            </Stack>
          ))}
        </Box>
        <Divider />
        <Typography variant="caption" color="text.secondary">
          {t('incident.overviewSubtitle', 'Includes all service requests for your account.')}
        </Typography>
      </Stack>
    </Card>
  );
};
