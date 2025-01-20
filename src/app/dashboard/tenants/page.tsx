'use client';

import type { ChangeEvent, MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Download01Icon from '@untitled-ui/icons-react/build/esm/Download01';
import PlusIcon from '@untitled-ui/icons-react/build/esm/Plus';
import Upload01Icon from '@untitled-ui/icons-react/build/esm/Upload01';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';

import { clientsApi } from 'src/api/clients';
import { Seo } from 'src/components/seo';
;

import { useSelection } from 'src/hooks/use-selection';
import { ClientListSearch } from 'src/sections/dashboard/client/client-list-search';
import { ClientListTable } from 'src/sections/dashboard/client/client-list-table';
import type { Client } from 'src/types/client';
import { paths } from 'src/paths';

interface Filters {
  query?: string;
  has_accepted_marketing?: boolean;
  is_potential?: boolean;
  is_returning?: boolean;
}

interface ClientsSearchState {
  filters: Filters;
  page: number;
  rowsPerPage: number;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

const useClientsSearch = () => {

  const [state, setState] = useState<ClientsSearchState>({
    filters: {
      query: undefined,
      has_accepted_marketing: undefined,
      is_potential: undefined,
      is_returning: undefined,
    },
    page: 0,
    rowsPerPage: 5,
    sortBy: 'updated_at',
    sortDir: 'desc',
  });

  const handleFiltersChange = useCallback((filters: Filters): void => {
    setState((prevState) => ({
      ...prevState,
      filters,
    }));
  }, []);

  const handleSortChange = useCallback(
    (sort: { sortBy: string; sortDir: 'asc' | 'desc' }): void => {
      setState((prevState) => ({
        ...prevState,
        sortBy: sort.sortBy,
        sortDir: sort.sortDir,
      }));
    },
    []
  );

  const handlePageChange = useCallback(
    (event: MouseEvent<HTMLButtonElement> | null, page: number): void => {
      setState((prevState) => ({
        ...prevState,
        page,
      }));
    },
    []
  );

  const handleRowsPerPageChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setState((prevState) => ({
      ...prevState,
      rowsPerPage: parseInt(event.target.value, 10),
    }));
  }, []);

  return {
    handleFiltersChange,
    handleSortChange,
    handlePageChange,
    handleRowsPerPageChange,
    state,
  };
};

interface ClientsStoreState {
  clients: Client[];
  clientsCount: number;
}

const useClientsStore = (searchState: ClientsSearchState) => {

  const [state, setState] = useState<ClientsStoreState>({
    clients: [],
    clientsCount: 0,
  });

  const handleClientsGet = useCallback(async () => {
    try {
      const response = await clientsApi.getClients(searchState);


      setState({
        clients: response.data,
        clientsCount: response.count,
      });

    } catch (err) {
      console.error(err);
    }
  }, [searchState]);

  useEffect(
    () => {
      handleClientsGet();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchState]
  );

  return {
    ...state,
  };
};

const useClientsIds = (clients: Client[] = []) => {
  return useMemo(() => {
    return clients.map((client) => client.id);
  }, [clients]);
};

const Page = () => {
  const clientsSearch = useClientsSearch();
  const clientsStore = useClientsStore(clientsSearch.state);
  const clientsIds = useClientsIds(clientsStore.clients);
  const clientsSelection = useSelection<string>(clientsIds.filter((id): id is string => id !== undefined));



  return (
    <>
      <Seo title="Dashboard: Client List" />
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
            <Card>
              <ClientListSearch
                onFiltersChange={clientsSearch.handleFiltersChange}
                onSortChange={clientsSearch.handleSortChange}
                sortBy={clientsSearch.state.sortBy}
                sortDir={clientsSearch.state.sortDir}
              />
              <ClientListTable
                count={clientsStore.clientsCount}
                items={clientsStore.clients}
                onDeselectAll={clientsSelection.handleDeselectAll}
                onDeselectOne={clientsSelection.handleDeselectOne}
                onPageChange={clientsSearch.handlePageChange}
                onRowsPerPageChange={clientsSearch.handleRowsPerPageChange}
                onSelectAll={clientsSelection.handleSelectAll}
                onSelectOne={clientsSelection.handleSelectOne}
                page={clientsSearch.state.page}
                rowsPerPage={clientsSearch.state.rowsPerPage}
                selected={clientsSelection.selected}
              />
            </Card>
          </Stack>
        </Container>
      </Box>
    </>
  );
};

export default Page;
