'use client';

import type { FC } from 'react';
import { useMemo, useState, useTransition } from 'react';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ArrowRightIcon from '@untitled-ui/icons-react/build/esm/ArrowRight';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';
import { deleteIncidentReport } from 'src/app/actions/incident/incident-report-actions';
import { PopupModal } from 'src/components/modal-dialog';

import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import type { IncidentReport } from 'src/types/incident-report';
import { ServiceRequestCard } from 'src/sections/dashboard/service-requests/service-request-card';
import toast from 'react-hot-toast';

interface IncidentsClientProps {
  incidents: IncidentReport[];
}

export const IncidentsClient: FC<IncidentsClientProps> = ({ incidents }) => {
  const { t } = useTranslation();
  const [isNavigatingToCreate, setIsNavigatingToCreate] = useState(false);
  const [items, setItems] = useState<IncidentReport[]>(incidents);
  const [statusFilter, setStatusFilter] = useState<'all' | IncidentReport['status']>('all');
  const [visibleCount, setVisibleCount] = useState(8);
  const [isPending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const activeStatuses: IncidentReport['status'][] = ['open', 'in_progress', 'on_hold', 'resolved'];
  const archivedStatuses: IncidentReport['status'][] = ['closed', 'cancelled'];

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return items;
    return items.filter((i) => i.status === statusFilter);
  }, [items, statusFilter]);

  const visible = filtered.slice(0, visibleCount);

  const handleShowMore = () => {
    setVisibleCount((c) => c + 8);
  };

  const handleDelete = (id: string) => {
    setConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!confirmId) return;
    const id = confirmId;
    setConfirmId(null);
    startTransition(async () => {
      const res = await deleteIncidentReport(id);
      if (!res.success) {
        toast.error(res.error || t('common.actionDeleteError', 'Delete failed'));
        return;
      }
      toast.success(t('common.actionDeleteSuccess', 'Deleted'));
      setItems((prev) => prev.filter((i) => i.id !== id));
    });
  };

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
          <Typography variant="h3">{t('incident.incidentReports', 'Incident reports')}</Typography>
          <Breadcrumbs separator={<KeyboardArrowRightIcon />}>
            <Link
              color="text.primary"
              component={RouterLink}
              href={paths.dashboard.index}
              variant="subtitle2"
            >
              {t('nav.dashboard', 'Dashboard')}
            </Link>
            <Typography
              color="text.secondary"
              variant="subtitle2"
            >
              {t('incident.incidentReports', 'Incident reports')}
            </Typography>
          </Breadcrumbs>
        </Stack>
        <Card
          elevation={16}
          sx={{
            alignItems: 'center',
            borderRadius: 1,
            display: 'flex',
            justifyContent: 'space-between',
            mb: 8,
            mt: 6,
            px: 3,
            py: 2,
          }}
        >
          <div>
            <Typography variant="subtitle1">
              {t('incident.list.heroTitle', 'Keep track of every incident in one place.')}
            </Typography>
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ mt: 0.5 }}
            >
              {t('incident.list.heroSubtitle', 'Assign priorities, flag emergencies, and follow up with residents quickly.')}
            </Typography>
          </div>
          <Button
            component={RouterLink}
            href={paths.dashboard.serviceRequests.create}
            variant="contained"
            onClick={() => setIsNavigatingToCreate(true)}
            disabled={isNavigatingToCreate}
            startIcon={isNavigatingToCreate ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {t('incident.list.cta', 'New incident')}
          </Button>
        </Card>
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" justifyContent="space-between">
            <Typography variant="h4">{t('incident.list.sectionTitle', 'Open incidents')}</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
              {(['all', ...activeStatuses, ...archivedStatuses] as const).map((status) => {
                const isActive = statusFilter === status;
                return (
                  <Button
                    key={status}
                    variant={isActive ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => {
                      setVisibleCount(8);
                      setStatusFilter(status);
                    }}
                  >
                    {status === 'all'
                      ? t('incident.list.filterAll', 'All')
                      : t(`incident.status.${status}`, status.replace(/_/g, ' '))}
                  </Button>
                );
              })}
            </Stack>
          </Stack>
          <Typography color="text.secondary" variant="body1">
            {archivedStatuses.includes(statusFilter as IncidentReport['status'])
              ? t('incident.list.sectionSubtitleArchived', 'Closed and cancelled reports.')
              : t('incident.list.sectionSubtitle', 'Review, triage, and prioritize resident-reported issues.')}
          </Typography>
        </Stack>
        <Grid
          container
          spacing={4}
        >
          {visible.map((incident) => (
            <Grid
              key={incident.id}
              size={{
                xs: 12,
                sm: 6,
                md: 4,
                lg: 3,
              }}
            >
              <ServiceRequestCard
                incident={incident}
                href={paths.dashboard.serviceRequests.details.replace(':requestId', incident.id)}
                onDelete={
                  archivedStatuses.includes(incident.status)
                    ? () => handleDelete(incident.id)
                    : undefined
                }
                deleting={isPending && confirmId === incident.id}
              />
            </Grid>
          ))}
          {!filtered.length && (
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ p: 3 }}>
                <Typography variant="subtitle1">{t('incident.list.emptyTitle', 'No incidents yet.')}</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                  {t('incident.list.emptySubtitle', 'Create a new incident to get started.')}
                </Typography>
              </Card>
            </Grid>
          )}
        </Grid>
        {visibleCount < filtered.length && (
          <Stack alignItems="center" sx={{ mt: 3 }}>
            <Button variant="outlined" onClick={handleShowMore}>
              {t('common.actionShowMore', 'Show more')}
            </Button>
          </Stack>
        )}
      </Container>
      <PopupModal
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={confirmDelete}
        title={t('common.actionDeleteConfirm', 'Delete this incident permanently?')}
        confirmText={t('common.actionDelete', 'Delete')}
        cancelText={t('common.actionCancel', 'Cancel')}
        type="confirmation"
        loading={isPending}
      >
        <Typography>{t('incident.list.confirmDelete', 'This will remove the incident permanently.')}</Typography>
      </PopupModal>
    </Box>
  );
};
