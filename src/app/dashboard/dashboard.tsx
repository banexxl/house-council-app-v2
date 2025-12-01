'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useSettings } from 'src/hooks/use-settings';
import { OverviewBanner } from 'src/sections/dashboard/overview/overview-banner';
import { OverviewEvents } from 'src/sections/dashboard/overview/overview-events';
import { OverviewInbox } from 'src/sections/dashboard/overview/overview-inbox';
import { OverviewTransactions } from 'src/sections/dashboard/overview/overview-transactions';
import { OverviewSubscriptionUsage } from 'src/sections/dashboard/overview/overview-subscription-usage';
import { OverviewHelp } from 'src/sections/dashboard/overview/overview-help';
import { OverviewJobs } from 'src/sections/dashboard/overview/overview-jobs';
import { OverviewTips } from 'src/sections/dashboard/overview/overview-tips';
import { Grid } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { OverviewStatusCard } from 'src/sections/dashboard/overview/overview-status-card';
import CheckIcon from '@mui/icons-material/CheckCircleOutline';
import PendingIcon from '@mui/icons-material/HourglassEmpty';
import PauseIcon from '@mui/icons-material/PauseCircleOutline';
import BuildIcon from '@mui/icons-material/BuildCircle';
import LockIcon from '@mui/icons-material/Lock';
import CloseIcon from '@mui/icons-material/Cancel';

import type { IncidentReport } from 'src/types/incident-report';
import type { CalendarEvent } from 'src/types/calendar';
import { paths } from 'src/paths';

type DashboardProps = {
  incidents: IncidentReport[];
  events: { upcoming: CalendarEvent[]; past: CalendarEvent[] };
};

const Dashboard = ({ incidents, events }: DashboardProps) => {

  const now = new Date();
  const subMinutes = (date: Date, minutes: number) => new Date(date.getTime() - minutes * 60000);
  const subHours = (date: Date, hours: number) => new Date(date.getTime() - hours * 3600000);
  const subDays = (date: Date, days: number) => new Date(date.getTime() - days * 86400000);
  const settings = useSettings();
  const { t } = useTranslation()
  const statusCounts = incidents.reduce<Record<IncidentReport['status'], number>>((acc, incident) => {
    acc[incident.status] = (acc[incident.status] || 0) + 1;
    return acc;
  }, { open: 0, in_progress: 0, on_hold: 0, resolved: 0, closed: 0, cancelled: 0 });
  const totalCount = Object.values(statusCounts).reduce((sum, val) => sum + (val || 0), 0);
  const statusMeta: Array<{ key: IncidentReport['status']; color: string; bg: string; icon: JSX.Element; subtitle?: string }> = [
    { key: 'open', color: 'info.main', bg: 'info.light', icon: <PendingIcon />, subtitle: t('incident.overviewOpen', 'Currently opened requests') },
    { key: 'in_progress', color: 'warning.main', bg: 'warning.light', icon: <BuildIcon />, subtitle: t('incident.overviewInProgress', 'Work in progress') },
    { key: 'on_hold', color: 'default', bg: 'grey.100', icon: <PauseIcon />, subtitle: t('incident.overviewOnHold', 'Waiting for action') },
    { key: 'resolved', color: 'success.main', bg: 'success.light', icon: <CheckIcon />, subtitle: t('incident.overviewResolved', 'Awaiting verification') },
    { key: 'closed', color: 'text.secondary', bg: 'grey.100', icon: <LockIcon />, subtitle: t('incident.overviewClosed', 'Closed requests') },
    { key: 'cancelled', color: 'error.main', bg: 'error.light', icon: <CloseIcon />, subtitle: t('incident.overviewCancelled', 'Cancelled requests') },
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
           <Grid size={{ xs: 12, md: 7 }}>
             <OverviewBanner />
           </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <OverviewEvents upcoming={events.upcoming} past={events.past} />
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <OverviewSubscriptionUsage
                chartSeries={[
                  {
                    name: 'This year',
                    data: [40, 37, 41, 42, 45, 42, 36, 45, 40, 44, 38, 41],
                  },
                  {
                    name: 'Last year',
                    data: [26, 22, 19, 22, 24, 28, 23, 25, 24, 21, 17, 19],
                  },
                ]}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <OverviewInbox
                messages={[
                  {
                    id: 'b91cbe81ee3efefba6b915a7',
                    content: 'Hello, we spoke earlier on the phone',
                    created_at: subMinutes(now, 2),
                    senderAvatar: '/assets/avatars/avatar-alcides-antonio.png',
                    senderName: 'Alcides Antonio',
                    senderOnline: true,
                  },
                  {
                    id: 'de0eb1ac517aae1aa57c0b7e',
                    content: 'Is the job still available?',
                    created_at: subMinutes(now, 56),
                    senderAvatar: '/assets/avatars/avatar-marcus-finn.png',
                    senderName: 'Marcus Finn',
                    senderOnline: false,
                  },
                  {
                    id: '38e2b0942c90d0ad724e6f40',
                    content: 'What is a screening task? I’d like to',
                    created_at: subHours(subMinutes(now, 23), 3),
                    senderAvatar: '/assets/avatars/avatar-carson-darrin.png',
                    senderName: 'Carson Darrin',
                    senderOnline: true,
                  },
                  {
                    id: '467505f3356f25a69f4c4890',
                    content: 'Still waiting for feedback',
                    created_at: subHours(subMinutes(now, 6), 8),
                    senderAvatar: '/assets/avatars/avatar-fran-perez.png',
                    senderName: 'Fran Perez',
                    senderOnline: true,
                  },
                  {
                    id: '7e6af808e801a8361ce4cf8b',
                    content: 'Need more information about campaigns',
                    created_at: subHours(subMinutes(now, 18), 10),
                    senderAvatar: '/assets/avatars/avatar-jie-yan-song.png',
                    senderName: 'Jie Yan Song',
                    senderOnline: false,
                  },
                ]}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <OverviewTransactions
                transactions={[
                  {
                    id: 'd46800328cd510a668253b45',
                    amount: 25000,
                    created_at: now.getTime(),
                    currency: 'usd',
                    sender: 'Devias',
                    status: 'on_hold',
                    type: 'receive',
                  },
                  {
                    id: 'b4b19b21656e44b487441c50',
                    amount: 6843,
                    created_at: subDays(now, 1).getTime(),
                    currency: 'usd',
                    sender: 'Zimbru',
                    status: 'confirmed',
                    type: 'send',
                  },
                  {
                    id: '56c09ad91f6d44cb313397db',
                    amount: 91823,
                    created_at: subDays(now, 1).getTime(),
                    currency: 'usd',
                    sender: 'Vertical Jelly',
                    status: 'failed',
                    type: 'send',
                  },
                  {
                    id: 'aaeb96c5a131a55d9623f44d',
                    amount: 49550,
                    created_at: subDays(now, 3).getTime(),
                    currency: 'usd',
                    sender: 'Devias',
                    status: 'confirmed',
                    type: 'receive',
                  },
                ]}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <OverviewJobs />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <OverviewHelp />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </>
  );
};

export default Dashboard;
