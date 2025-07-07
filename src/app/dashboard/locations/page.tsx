'use server'

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import { getAllAddedLocationsByClientId } from 'src/app/actions/location/location-services';
import { LocationsTable } from 'src/sections/dashboard/locations/locations-table';
import { getServerAuth } from 'src/libs/supabase/server-auth';

const Page = async () => {

  const { client } = await getServerAuth();
  const { data } = await getAllAddedLocationsByClientId(client?.id!);

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
