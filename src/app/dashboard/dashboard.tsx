'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import InfoCircleIcon from '@untitled-ui/icons-react/build/esm/InfoCircle';
import Link01Icon from '@untitled-ui/icons-react/build/esm/Link01';
import { useSettings } from 'src/hooks/use-settings';
import { OverviewEvents } from 'src/sections/dashboard/overview/overview-events';
import { OverviewTransactions } from 'src/sections/dashboard/overview/overview-transactions';
import Briefcase01Icon from '@untitled-ui/icons-react/build/esm/Briefcase01';
import ArrowRightIcon from '@untitled-ui/icons-react/build/esm/ArrowRight';
import { Grid } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { OverviewStatusCard } from 'src/sections/dashboard/overview/overview-status-card';
import CheckIcon from '@mui/icons-material/CheckCircleOutline';
import PendingIcon from '@mui/icons-material/HourglassEmpty';
import PauseIcon from '@mui/icons-material/PauseCircleOutline';
import BuildIcon from '@mui/icons-material/BuildCircle';
import LockIcon from '@mui/icons-material/Lock';
import CloseIcon from '@mui/icons-material/Cancel';
import { tokens } from 'src/locales/tokens';

import type { IncidentReport } from 'src/types/incident-report';
import type { CalendarEvent } from 'src/types/calendar';
import type { Invoice } from 'src/types/invoice';
import { paths } from 'src/paths';
import { OverviewLinkCard } from 'src/sections/dashboard/overview/info-card';

type DashboardProps = {
  incidents: IncidentReport[];
  events: { upcoming: CalendarEvent[]; past: CalendarEvent[] };
  invoices: Invoice[];
};

const Dashboard = ({ incidents, events, invoices }: DashboardProps) => {

  const settings = useSettings();
  const { t } = useTranslation();
  const statusCounts = incidents.reduce<Record<IncidentReport['status'], number>>((acc, incident) => {
    acc[incident.status] = (acc[incident.status] || 0) + 1;
    return acc;
  }, { open: 0, in_progress: 0, on_hold: 0, resolved: 0, closed: 0, cancelled: 0 });
  const totalCount = Object.values(statusCounts).reduce((sum, val) => sum + (val || 0), 0);
  const statusMeta: Array<{ key: IncidentReport['status']; color: string; bg: string; icon: JSX.Element; subtitle?: string }> = [
    { key: 'open', color: 'info.main', bg: 'info.light', icon: <PendingIcon />, subtitle: t('incident.overview.open') },
    { key: 'in_progress', color: 'warning.main', bg: 'warning.light', icon: <BuildIcon />, subtitle: t('incident.overview.inProgress') },
    { key: 'on_hold', color: 'default', bg: 'grey.100', icon: <PauseIcon />, subtitle: t('incident.overview.onHold') },
    { key: 'resolved', color: 'success.main', bg: 'success.light', icon: <CheckIcon />, subtitle: t('incident.overview.resolved') },
    { key: 'closed', color: 'text.secondary', bg: 'grey.100', icon: <LockIcon />, subtitle: t('incident.overview.closed') },
    { key: 'cancelled', color: 'error.main', bg: 'error.light', icon: <CloseIcon />, subtitle: t('incident.overview.cancelled') },
  ];

  return (
    <>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8,
        }}
      >
        <Container maxWidth={settings.stretch ? false : 'xl'}>
          <Grid
            container
            spacing={{ xs: 3, lg: 4, }}
          >
            <Grid size={{ xs: 12, md: 12 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                spacing={4}
              >
                <div>
                  <Typography variant="h4">{t('nav.overview')}</Typography>
                </div>
              </Stack>
            </Grid>
            {statusMeta.map((meta) => (
              <Grid key={meta.key} size={{ xs: 12, md: 4 }}>
                <OverviewStatusCard
                  label={t(`incident.status.${meta.key}`, meta.key.replace(/_/g, ' '))}
                  count={statusCounts[meta.key] || 0}
                  color={meta.color}
                  bg={meta.bg}
                  icon={meta.icon}
                  href={paths.dashboard.serviceRequests.index}
                  subtitle={meta.subtitle}
                  total={totalCount}
                />
              </Grid>
            ))}
            <Grid size={{ xs: 12, md: 7 }} sx={{ order: 1 }}>
              <Stack spacing={3}>
                <OverviewTransactions invoices={invoices} />
                <OverviewLinkCard
                  icon={<InfoCircleIcon />}
                  iconTitle={t(tokens.dashboard.overview.help.iconTitle)}
                  title={t(tokens.dashboard.overview.help.title)}
                  description={t(tokens.dashboard.overview.help.description)}
                  url={paths.docs}
                  actionIcon={<Link01Icon />}
                  actionLabel={t(tokens.dashboard.overview.help.action)}
                />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }} sx={{ order: 3 }}>
              <OverviewEvents upcoming={events.upcoming} past={events.past} />
            </Grid>

            {/* <Grid size={{ xs: 6 }} sx={{ order: 5 }}>
              <OverviewLinkCard
                icon={<Briefcase01Icon />}
                iconTitle={t(tokens.dashboard.overview.jobs.iconTitle)}
                title={t(tokens.dashboard.overview.jobs.title)}
                description={t(tokens.dashboard.overview.jobs.description)}
                url={paths.dashboard.jobs.index}
                actionIcon={<ArrowRightIcon />}
                actionLabel={t(tokens.dashboard.overview.jobs.action)}
              />
            </Grid> */}
          </Grid>
        </Container>
      </Box>
    </>
  );
};

export default Dashboard;
