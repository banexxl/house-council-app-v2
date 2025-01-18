'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import ArrowLeftIcon from '@untitled-ui/icons-react/build/esm/ArrowLeft';
import ChevronDownIcon from '@untitled-ui/icons-react/build/esm/ChevronDown';
import Edit02Icon from '@untitled-ui/icons-react/build/esm/Edit02';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Unstable_Grid2';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

import { clientsApi } from 'src/api/clients';
import { RouterLink } from 'src/components/router-link';
import { Seo } from 'src/components/seo';
import { useMounted } from 'src/hooks/use-mounted';

import { paths } from 'src/paths';
import { ClientBasicDetails } from 'src/sections/dashboard/client/client-basic-details';
import { ClientDataManagement } from 'src/sections/dashboard/client/client-data-management';
import { ClientEmailsSummary } from 'src/sections/dashboard/client/client-emails-summary';
import { ClientInvoices } from 'src/sections/dashboard/client/client-invoices';
import { ClientPayment } from 'src/sections/dashboard/client/client-payment';
import { ClientLogs } from 'src/sections/dashboard/client/client-logs';
import type { Client } from 'src/types/client';
import { ClientInvoice, ClientLog } from 'src/types/client';
import { getInitials } from 'src/utils/get-initials';

const tabs = [
  { label: 'Details', value: 'details' },
  { label: 'Invoices', value: 'invoices' },
  { label: 'Logs', value: 'logs' },
];

const useClient = (): Client | null => {
  const isMounted = useMounted();
  const [client, setClient] = useState<Client | null>(null);

  const handleClientGet = useCallback(async () => {
    try {
      const response = await clientsApi.getClient();

      if (isMounted()) {
        setClient(response);
      }
    } catch (err) {
      console.error(err);
    }
  }, [isMounted]);

  useEffect(
    () => {
      handleClientGet();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return client;
};

const useInvoices = (): ClientInvoice[] => {
  const isMounted = useMounted();
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);

  const handleInvoicesGet = useCallback(async () => {
    try {
      const response = await clientsApi.getInvoices();

      if (isMounted()) {
        setInvoices(response);
      }
    } catch (err) {
      console.error(err);
    }
  }, [isMounted]);

  useEffect(
    () => {
      handleInvoicesGet();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return invoices;
};

const useLogs = (): ClientLog[] => {
  const isMounted = useMounted();
  const [logs, setLogs] = useState<ClientLog[]>([]);

  const handleLogsGet = useCallback(async () => {
    try {
      const response = await clientsApi.getLogs();

      if (isMounted()) {
        setLogs(response);
      }
    } catch (err) {
      console.error(err);
    }
  }, [isMounted]);

  useEffect(
    () => {
      handleLogsGet();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return logs;
};

const Page = () => {
  const [currentTab, setCurrentTab] = useState<string>('details');
  const client = useClient();
  const invoices = useInvoices();
  const logs = useLogs();



  const handleTabsChange = useCallback((event: ChangeEvent<any>, value: string): void => {
    setCurrentTab(value);
  }, []);

  if (!client) {
    return null;
  }

  return (
    <>
      <Seo title="Dashboard: Client Details" />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8,
        }}
      >
        <Container maxWidth="xl">
          <Stack spacing={4}>
            <Stack spacing={4}>
              <div>
                <Link
                  color="text.primary"
                  component={RouterLink}
                  href={paths.dashboard.clients.index}
                  sx={{
                    alignItems: 'center',
                    display: 'inline-flex',
                  }}
                  underline="hover"
                >
                  <SvgIcon sx={{ mr: 1 }}>
                    <ArrowLeftIcon />
                  </SvgIcon>
                  <Typography variant="subtitle2">Clients</Typography>
                </Link>
              </div>
              <Stack
                alignItems="flex-start"
                direction={{
                  xs: 'column',
                  md: 'row',
                }}
                justifyContent="space-between"
                spacing={4}
              >
                <Stack
                  alignItems="center"
                  direction="row"
                  spacing={2}
                >
                  <Avatar
                    src={client.avatar}
                    sx={{
                      height: 64,
                      width: 64,
                    }}
                  >
                    {getInitials(client.name)}
                  </Avatar>
                  <Stack spacing={1}>
                    <Typography variant="h4">{client.email}</Typography>
                    <Stack
                      alignItems="center"
                      direction="row"
                      spacing={1}
                    >
                      <Typography variant="subtitle2">user_id:</Typography>
                      <Chip
                        label={client.id}
                        size="small"
                      />
                    </Stack>
                  </Stack>
                </Stack>
                <Stack
                  alignItems="center"
                  direction="row"
                  spacing={2}
                >
                  <Button
                    color="inherit"
                    component={RouterLink}
                    endIcon={
                      <SvgIcon>
                        <Edit02Icon />
                      </SvgIcon>
                    }
                    href={paths.dashboard.clients.new}
                  >
                    Edit
                  </Button>
                  <Button
                    endIcon={
                      <SvgIcon>
                        <ChevronDownIcon />
                      </SvgIcon>
                    }
                    variant="contained"
                  >
                    Actions
                  </Button>
                </Stack>
              </Stack>
              <div>
                <Tabs
                  indicatorColor="primary"
                  onChange={handleTabsChange}
                  scrollButtons="auto"
                  sx={{ mt: 3 }}
                  textColor="primary"
                  value={currentTab}
                  variant="scrollable"
                >
                  {tabs.map((tab) => (
                    <Tab
                      key={tab.value}
                      label={tab.label}
                      value={tab.value}
                    />
                  ))}
                </Tabs>
                <Divider />
              </div>
            </Stack>
            {currentTab === 'details' && (
              <div>
                <Grid
                  container
                  spacing={4}
                >
                  <Grid
                    xs={12}
                    lg={4}
                  >
                    <ClientBasicDetails
                      address_1={client.address_1}
                      address_2={client.address_2}
                      email={client.email}
                      isVerified={!!client.is_verified}
                      phone={client.phone}
                    />
                  </Grid>
                  <Grid
                    xs={12}
                    lg={8}
                  >
                    <Stack spacing={4}>
                      <ClientPayment />
                      <ClientEmailsSummary />
                      <ClientDataManagement />
                    </Stack>
                  </Grid>
                </Grid>
              </div>
            )}
            {currentTab === 'invoices' && <ClientInvoices invoices={invoices} />}
            {currentTab === 'logs' && <ClientLogs logs={logs} />}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

export default Page;
