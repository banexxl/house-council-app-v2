import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';

import { readAllClientsAction } from 'src/app/actions/client-actions/client-actions';
import { ClientListTable } from 'src/sections/dashboard/client/client-list-table';
import { ClientTableHeader } from 'src/sections/dashboard/client/client-table-header';
import { BaseEntity, readAllEntities } from 'src/app/actions/base-entity-services';

const Page = async () => {

  const { getAllClientsActionData } = await readAllClientsAction()
  const clientStatuses = await readAllEntities<BaseEntity>("tblClientStatuses")

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
              clientStatuses={clientStatuses}
            />
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default Page;
