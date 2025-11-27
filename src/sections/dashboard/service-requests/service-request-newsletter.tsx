import type { FC } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';

export const IncidentCallout: FC = () => {
  return (
    <Card
      elevation={16}
      sx={{
        py: 10,
        px: 8,
      }}
    >
      <Grid container spacing={3}>
        <Grid
          size={{ xs: 12, md: 6 }}
          sx={{
            order: {
              xs: 1,
              md: 0,
            },
          }}
        >
          <Typography variant="h4">Need to notify residents?</Typography>
          <Typography
            color="text.secondary"
            variant="body2"
            sx={{
              mb: 3,
              mt: 1,
            }}
          >
            Capture emails to send maintenance updates or schedule follow-ups for this incident.
          </Typography>
          <TextField fullWidth label="Contact email" name="email" sx={{ flexGrow: 1 }} type="email" />
          <Button
            component={RouterLink}
            href={paths.dashboard.serviceRequests.index}
            fullWidth
            size="large"
            sx={{ mt: 2 }}
            variant="contained"
          >
            View incident queue
          </Button>
        </Grid>
        <Grid
          size={{ xs: 12, md: 6 }}
          sx={{
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Box
            component="img"
            src="/assets/iconly/iconly-glass-volume.svg"
            sx={{
              maxWidth: '100%',
              width: 260,
            }}
          />
        </Grid>
      </Grid>
    </Card>
  );
};

// Backwards compatibility for old imports
export const PostNewsletter = IncidentCallout;
