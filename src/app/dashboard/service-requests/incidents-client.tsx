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
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { useTranslation } from 'react-i18next';
import { deleteIncidentReport } from 'src/app/actions/incident/incident-report-actions';

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
  const [showArchived, setShowArchived] = useState(false);
  const [visibleActiveCount, setVisibleActiveCount] = useState(8);
  const [visibleArchivedCount, setVisibleArchivedCount] = useState(8);
  const [isPending, startTransition] = useTransition();

  const activeStatuses: IncidentReport['status'][] = ['open', 'in_progress', 'on_hold', 'resolved'];
  const archivedStatuses: IncidentReport['status'][] = ['closed', 'cancelled'];

  const activeIncidents = useMemo(
    () => items.filter((i) => activeStatuses.includes(i.status)),
    [items]
  );
  const archivedIncidents = useMemo(
    () => items.filter((i) => archivedStatuses.includes(i.status)),
    [items]
  );

  const visibleActive = activeIncidents.slice(0, visibleActiveCount);
  const visibleArchived = archivedIncidents.slice(0, visibleArchivedCount);

  const handleShowMore = () => {
    if (showArchived) {
      setVisibleArchivedCount((c) => c + 8);
    } else {
      setVisibleActiveCount((c) => c + 8);
    }
  };

  const handleDelete = (id: string) => {
    const confirmed = window.confirm(t('common.actionDeleteConfirm', 'Delete this incident permanently?'));
    if (!confirmed) return;
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
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Typography variant="h4">
              {showArchived
                ? t('incident.list.archivedTitle', 'Archived incidents')
                : t('incident.list.sectionTitle', 'Open incidents')}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />
              }
              label={t('incident.list.showArchived', 'Show archived')}
            />
          </Stack>
          <Typography
            color="text.secondary"
            variant="body1"
          >
            {showArchived
              ? t('incident.listSectionSubtitleArchived', 'Closed and cancelled reports.')
              : t('incident.list.sectionSubtitle', 'Review, triage, and prioritize resident-reported issues.')}
          </Typography>
        </Stack>
        <Grid
          container
          spacing={4}
        >
          {(showArchived ? visibleArchived : visibleActive).map((incident) => (
            <Grid
              key={incident.id}
              size={{
                xs: 12,
                sm: 6,
                md: 4,
                lg: 3,
              }}
            >
              <Stack spacing={1.5}>
                <ServiceRequestCard
                  incident={incident}
                  href={paths.dashboard.serviceRequests.details.replace(':requestId', incident.id)}
                />
                {showArchived && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleDelete(incident.id)}
                    disabled={isPending}
                  >
                    {t('common.actionDelete', 'Delete')}
                  </Button>
                )}
              </Stack>
            </Grid>
          ))}
          {!showArchived && !activeIncidents.length && (
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ p: 3 }}>
                <Typography variant="subtitle1">{t('incident.list.emptyTitle', 'No incidents yet.')}</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                  {t('incident.list.emptySubtitle', 'Create a new incident to get started.')}
                </Typography>
              </Card>
            </Grid>
          )}
          {showArchived && !archivedIncidents.length && (
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ p: 3 }}>
                <Typography variant="subtitle1">{t('incident.list.noArchived', 'No archived incidents.')}</Typography>
              </Card>
            </Grid>
          )}
        </Grid>
        {!showArchived && visibleActiveCount < activeIncidents.length && (
          <Stack alignItems="center" sx={{ mt: 3 }}>
            <Button variant="outlined" onClick={handleShowMore}>
              {t('common.actionShowMore', 'Show more')}
            </Button>
          </Stack>
        )}
        {showArchived && visibleArchivedCount < archivedIncidents.length && (
          <Stack alignItems="center" sx={{ mt: 3 }}>
            <Button variant="outlined" onClick={handleShowMore}>
              {t('common.actionShowMore', 'Show more')}
            </Button>
          </Stack>
        )}
      </Container>
    </Box>
  );
};
