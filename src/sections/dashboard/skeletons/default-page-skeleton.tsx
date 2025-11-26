'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

/**
 * Generic loading skeleton for dashboard pages.
 * Shows a page title placeholder and three content cards.
 */
export const DefaultPageSkeleton = () => {
  return (
    <Stack spacing={3}>
      <Skeleton variant="text" width={260} height={36} />
      <Grid container spacing={3}>
        {[1, 2, 3].map((key) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={key}>
            <Card>
              <CardContent>
                <Stack spacing={1.5}>
                  <Skeleton variant="text" width="70%" height={28} />
                  <Skeleton variant="text" width="50%" height={20} />
                  <Skeleton variant="rectangular" height={120} />
                  <Skeleton variant="text" width="80%" height={18} />
                  <Skeleton variant="text" width="60%" height={18} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};
