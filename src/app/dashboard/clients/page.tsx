import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';

import { getAllClientsAction } from 'src/app/actions/client-actions/client-actions';
import { ClientListSearch } from 'src/sections/dashboard/client/client-list-search';
import { ClientListTable } from 'src/sections/dashboard/client/client-list-table';
import { ClientTableHeader } from 'src/components/clients/client-table-header';

const Page = async () => {

  const { getAllClientsActionData } = await getAllClientsAction()
  console.log(getAllClientsActionData);


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
          <ClientTableHeader />
          <Card>
            <ClientListSearch />
            <ClientListTable
              count={getAllClientsActionData ? getAllClientsActionData.length : 0}
              items={getAllClientsActionData}
            />
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default Page;
