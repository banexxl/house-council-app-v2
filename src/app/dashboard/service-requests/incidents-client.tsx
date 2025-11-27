'use client';

import type { FC } from 'react';
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

import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import type { IncidentReport } from 'src/types/incident-report';
import { ServiceRequestCard } from 'src/sections/dashboard/service-requests/service-request-card';

interface IncidentsClientProps {
  incidents: IncidentReport[];
}

export const IncidentsClient: FC<IncidentsClientProps> = ({ incidents }) => {
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
          <Typography variant="h3">Incident reports</Typography>
          <Breadcrumbs separator={<KeyboardArrowRightIcon />}>
            <Link
              color="text.primary"
              component={RouterLink}
              href={paths.dashboard.index}
              variant="subtitle2"
            >
              Dashboard
            </Link>
            <Typography
              color="text.secondary"
              variant="subtitle2"
            >
              Incident reports
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
            <Typography variant="subtitle1">Keep track of every incident in one place.</Typography>
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ mt: 0.5 }}
            >
              Assign priorities, flag emergencies, and follow up with residents quickly.
            </Typography>
          </div>
          <Button
            component={RouterLink}
            href={paths.dashboard.serviceRequests.create}
            variant="contained"
          >
            New Incident
          </Button>
        </Card>
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h4">Open incidents</Typography>
          <Typography
            color="text.secondary"
            variant="body1"
          >
            Review, triage, and prioritize resident-reported issues.
          </Typography>
        </Stack>
        <Grid
          container
          spacing={4}
        >
          {incidents.map((incident) => (
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
              />
            </Grid>
          ))}
          {!incidents.length && (
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ p: 3 }}>
                <Typography variant="subtitle1">No incidents yet.</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                  Create a new incident to get started.
                </Typography>
              </Card>
            </Grid>
          )}
        </Grid>
        <Stack
          alignItems="center"
          direction="row"
          justifyContent="center"
          spacing={1}
          sx={{
            mt: 4,
            mb: 8,
          }}
        >
          <Button
            disabled
            startIcon={
              <SvgIcon>
                <ArrowRightIcon />
              </SvgIcon>
            }
          >
            Showing latest updates
          </Button>
        </Stack>
      </Container>
    </Box>
  );
};
