'use server'

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import { getAllAddedLocations } from 'src/app/actions/location-actions/location-services';
import { LocationsTable } from 'src/sections/dashboard/locations/locations-table';

const Page = async () => {

  const { data } = await getAllAddedLocations()

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        py: 8,
      }}
    >
      <Container maxWidth="xl">
        <Stack spacing={4}>
          <Card>
            <LocationsTable
              items={data}
            />
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default Page;
