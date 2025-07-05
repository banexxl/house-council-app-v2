import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';

import { readAllClientsAction } from 'src/app/actions/client/client-actions';
import { ClientListTable } from 'src/sections/dashboard/client/client-list-table';
import { ClientTableHeader } from 'src/sections/dashboard/client/client-table-header';

const Page = async () => {

  const [{ getAllClientsActionData }] = await Promise.all([
    readAllClientsAction(),
  ]);

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
          <ClientTableHeader allClients={getAllClientsActionData} />
          <Card>
            <ClientListTable
              items={getAllClientsActionData}
            />
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default Page;
