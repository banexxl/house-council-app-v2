import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import SvgIcon from '@mui/material/SvgIcon';
import PlusIcon from '@untitled-ui/icons-react/build/esm/Plus';
import Upload01Icon from '@untitled-ui/icons-react/build/esm/Upload01';
import Download01Icon from '@untitled-ui/icons-react/build/esm/Download01';

import { paths } from 'src/paths';
import { getAllClientsAction } from 'src/app/actions/client-actions/client-actions';

const Page = async () => {
  const { data, error } = await getAllClientsAction()
  console.log('data', data);

  if (!data || error || !data.length) {
    notFound();
  }

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
          <Stack
            direction="row"
            justifyContent="space-between"
            spacing={4}
          >
            <Stack spacing={1}>
              <Typography variant="h4">Clients</Typography>
              <Stack
                alignItems="center"
                direction="row"
                spacing={1}
              >
                <Button
                  color="inherit"
                  size="small"
                  startIcon={
                    <SvgIcon>
                      <Upload01Icon />
                    </SvgIcon>
                  }
                >
                  Import
                </Button>
                <Button
                  color="inherit"
                  size="small"
                  startIcon={
                    <SvgIcon>
                      <Download01Icon />
                    </SvgIcon>
                  }
                >
                  Export
                </Button>
              </Stack>
            </Stack>
            <Stack
              alignItems="center"
              direction="row"
              spacing={3}
            >
              <Button
                href={paths.dashboard.clients.new}
                startIcon={
                  <SvgIcon>
                    <PlusIcon />
                  </SvgIcon>
                }
                variant="contained"
              >
                Add
              </Button>
            </Stack>
          </Stack>
          {/* <Card>
            <ClientListSearch />
            <ClientListTable
              count={data.length}
              items={data}
            />
          </Card> */}
        </Stack>
      </Container>
    </Box>
  );
};

export default Page;
