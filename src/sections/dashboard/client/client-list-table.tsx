'use client'

import { useCallback, useMemo, useState, type ChangeEvent, type FC } from 'react';
import PropTypes from 'prop-types';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

import { Scrollbar } from 'src/components/scrollbar';
import { paths } from 'src/paths';
import type { Client, ClientStatus } from 'src/types/client';
import { getInitials } from 'src/utils/get-initials';
import { useTranslation } from 'react-i18next';
import { useSelection } from 'src/hooks/use-selection';
import { useDialog } from 'src/hooks/use-dialog';
import { PopupModal } from 'src/components/modal-dialog';
import { applySort } from 'src/utils/apply-sort';
import { FilterBar } from './table-filter';
import { deleteClientByIDsAction } from 'src/app/actions/client-actions/client-actions';

interface ClientListTableProps {
  items?: Client[];
  clientStatuses?: ClientStatus[];
}

interface DeleteClientsData {
  clientIds: string[];
}

const useClientSearch = () => {

  const [state, setState] = useState({
    all: false,
    has_accepted_marketing: false,
    is_verified: false,
    is_returning: false,
    query: '',
    page: 0,
    rowsPerPage: 5,
    sortBy: 'updated_at' as keyof Client,
    sortDir: 'desc' as 'asc' | 'desc',
  });

  const handleQueryChange = useCallback((filters: Partial<typeof state>) => {
    setState((prevState) => ({
      ...prevState,
      ...filters,
    }));
  }, []);

  const handleTabsChange = useCallback((value: string) => {
    setState((prevState) => ({
      ...prevState,
      all: value === 'all',
      has_accepted_marketing: value === 'has_accepted_marketing',
      is_verified: value === 'is_verified',
      is_returning: value === 'is_returning',
    }));
  }, []);

  const handlePageChange = useCallback((event: any, page: number) => {
    setState((prevState) => ({
      ...prevState,
      page,
    }));
  }, []);

  const handleRowsPerPageChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setState((prevState) => ({
      ...prevState,
      page: 0,
      rowsPerPage: parseInt(event.target.value, 10),
    }));
  }, []);

  const handleSortChange = useCallback((sortBy: keyof Client, sortDir: 'asc' | 'desc') => {
    setState((prevState) => ({
      ...prevState,
      sortBy,
      sortDir,
    }));
  }, []);

  return {
    handleTabsChange,
    handleQueryChange,
    handleSortChange,
    handlePageChange,
    handleRowsPerPageChange,
    state,
  };
};

export const ClientListTable: FC<ClientListTableProps> = ({ items = [], clientStatuses }) => {

  const [count, setCount] = useState(items.length);
  const clientIds = useMemo(() => items.map((client) => client.id), [items]);
  const clientSelection = useSelection(clientIds);
  const selectedSome = clientSelection.selected.length > 0 && clientSelection.selected.length < clientIds.length;
  const selectedAll = items.length > 0 && clientSelection.selected.length === clientIds.length;
  const enableBulkActions = clientSelection.selected.length > 0;

  const deleteClientsDialog = useDialog<DeleteClientsData>();
  const clientSearch = useClientSearch();

  const { t } = useTranslation();

  const handleDeleteClientsClick = useCallback(() => {
    deleteClientsDialog.handleOpen();
  }, [deleteClientsDialog]);

  const handleDeleteClientsConfirm = useCallback(async () => {
    deleteClientsDialog.handleClose();
    const deleteClientResponse = await deleteClientByIDsAction(clientSelection.selected);
    if (deleteClientResponse.deleteClientByIDsActionSuccess) {
      clientSelection.handleDeselectAll();
    }
  }, [deleteClientsDialog]);

  const visibleRows = useMemo(() => {
    // Apply filters based on state
    const filtered = items.filter((client) => {
      // Check query filter
      const matchesQuery = !clientSearch.state.query || client.name.toLowerCase().includes(clientSearch.state.query.toLowerCase());

      // Check "all" filter (if "all" is true, no other filters apply)
      if (clientSearch.state.all) {
        return matchesQuery;
      }

      // Apply individual filters
      const matchesAcceptedMarketing =
        !clientSearch.state.has_accepted_marketing || client.has_accepted_marketing === clientSearch.state.has_accepted_marketing;

      const matchesIsVerified =
        !clientSearch.state.is_verified || client.is_verified === clientSearch.state.is_verified;

      const matchesIsReturning =
        !clientSearch.state.is_returning || client.is_returning === clientSearch.state.is_returning;
      // Combine all filters
      return matchesQuery && matchesAcceptedMarketing && matchesIsVerified && matchesIsReturning;
    });

    setCount(filtered.length);
    // Apply sorting and pagination
    return applySort(filtered, clientSearch.state.sortBy, clientSearch.state.sortDir).slice(
      clientSearch.state.page * clientSearch.state.rowsPerPage,
      clientSearch.state.page * clientSearch.state.rowsPerPage + clientSearch.state.rowsPerPage
    );



  }, [items, clientSearch.state]);

  return (
    <Box sx={{ position: 'relative' }}>
      <FilterBar
        onTabsChange={clientSearch.handleTabsChange}
        onFiltersChange={clientSearch.handleQueryChange}
        onSortChange={clientSearch.handleSortChange}
        sortBy={clientSearch.state.sortBy}
        sortDir={clientSearch.state.sortDir}
        tabs={[
          { label: t('common.all'), value: 'all' },
          { label: t('clients.clientIsVerified'), value: 'is_verified' },
          { label: t('clients.clientHasAcceptedMarketing'), value: 'has_accepted_marketing' },
          { label: t('clients.clientIsReturning'), value: 'is_returning' },
        ]}
        sortOptions={[
          { label: t('clients.clientName'), value: 'name' },
          { label: t('clients.clientType'), value: 'type' },
          { label: t('clients.clientStatus'), value: 'status' },
          { label: t('common.updatedAt'), value: 'updated_at' },
        ]} />
      {enableBulkActions && (
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: 'center',
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark' ? 'neutral.800' : 'neutral.50',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            px: 2,
            py: 0.5,
            zIndex: 10,
          }}
        >
          <Checkbox
            checked={selectedAll}
            indeterminate={selectedSome}
            onChange={(event) => {
              if (event.target.checked) {
                clientSelection.handleSelectAll();
              } else {
                clientSelection.handleDeselectAll();
              }
            }}
          />
          <Button color="inherit" size="small" onClick={handleDeleteClientsClick}>
            {t('common.btnDelete')}
          </Button>
          {clientSelection.selected.length === 1 && (
            <Button color="inherit" size="small">
              {t('common.btnEdit')}
            </Button>
          )}
        </Stack>
      )}
      <Scrollbar>
        <Table sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedAll}
                  indeterminate={selectedSome}
                  onChange={(event) => {
                    if (event.target.checked) {
                      clientSelection.handleSelectAll();
                    } else {
                      clientSelection.handleDeselectAll();
                    }
                  }}
                />
              </TableCell>
              <TableCell>{t('clients.clientContactPerson')}/{t('clients.clientEmail')}</TableCell>
              <TableCell>{t('clients.clientName')}</TableCell>
              <TableCell>{t('clients.clientAddress1')}</TableCell>
              <TableCell>{t('clients.clientAddress2')}</TableCell>
              <TableCell>{t('clients.clientMobilePhone')}</TableCell>
              <TableCell>{t('clients.clientPhone')}</TableCell>
              <TableCell>{t('clients.clientType')}</TableCell>
              <TableCell>{t('clients.clientStatus')}</TableCell>
              <TableCell>{t('clients.clientIsVerified')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((client) => {
              const isSelected = clientSelection.selected.includes(client.id);
              return (
                <TableRow hover key={client.id} selected={isSelected}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={(event) => {
                        if (event.target.checked) {
                          clientSelection.handleSelectOne(client.id);
                        } else {
                          clientSelection.handleDeselectOne(client.id);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack alignItems="center" direction="row" spacing={1}>
                      <Avatar
                        src={client.avatar === '' ? '' : client.avatar}
                        sx={{ height: 42, width: 42 }}
                      >
                        {client.avatar === '' ? getInitials(client.name) : null}
                      </Avatar>
                      <div>
                        <Link
                          color="inherit"
                          component="a"
                          href={paths.dashboard.clients.details + client.id}
                          variant="subtitle2"
                        >
                          {client.contact_person}
                        </Link>
                        <Typography color="text.secondary" variant="body2">
                          {client.email}
                        </Typography>
                      </div>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ width: '200px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {client.name}
                  </TableCell>
                  <TableCell sx={{ width: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {client.address_1}
                  </TableCell>
                  <TableCell sx={{ width: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {client.address_2}
                  </TableCell>
                  <TableCell>{client.mobile_phone}</TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell>{client.type}</TableCell>
                  <TableCell>
                    {clientStatuses?.find((cs) => cs.id === client.client_status)?.name ?? ''}
                  </TableCell>
                  <TableCell>
                    {client.is_verified ? (
                      <SvgIcon>
                        <CheckCircleIcon color="success" />
                      </SvgIcon>
                    ) : (
                      <SvgIcon>
                        <CancelIcon color="error" />
                      </SvgIcon>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Scrollbar>
      <TablePagination
        component="div"
        count={count}
        onPageChange={clientSearch.handlePageChange}
        onRowsPerPageChange={clientSearch.handleRowsPerPageChange}
        page={clientSearch.state.page}
        rowsPerPage={clientSearch.state.rowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
        showFirstButton
        showLastButton
        labelRowsPerPage={t('common.rowsPerPage')}
      />
      <PopupModal
        isOpen={deleteClientsDialog.open}
        onClose={() => deleteClientsDialog.handleClose()}
        onConfirm={handleDeleteClientsConfirm}
        title={t('warning.deleteWarningTitle')}
        confirmText={t('common.btnDelete')}
        cancelText={t('common.btnClose')}
        children={t('warning.deleteWarningMessage')}
        type={'confirmation'} />
    </Box>
  );
};

ClientListTable.propTypes = {
  items: PropTypes.array,
};
