'use client'

import { useCallback, useMemo, useState, type ChangeEvent, type FC, type MouseEvent } from 'react';
import PropTypes from 'prop-types';
import ArrowRightIcon from '@untitled-ui/icons-react/build/esm/ArrowRight';
import Edit02Icon from '@untitled-ui/icons-react/build/esm/Edit02';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
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

import { RouterLink } from 'src/components/router-link';
import { Scrollbar } from 'src/components/scrollbar';
import { paths } from 'src/paths';
import type { Client } from 'src/types/client';
import { getInitials } from 'src/utils/get-initials';
import { useTranslation } from 'react-i18next';
import { useSelection } from 'src/hooks/use-selection';
import { useDialog } from 'src/hooks/use-dialog';
import { PopupModal } from 'src/components/modal-dialog';

interface ClientListTableProps {
  count?: number;
  items?: Client[];
}

interface DeleteClientsData {
  clientIds: string[];
}

const useClientSearch = () => {

  const [state, setState] = useState({
    query: '',
    page: 0,
    rowsPerPage: 5,
    sortBy: 'createdAt',
    sortDir: 'desc',
  })

  const handleQueryChange = useCallback((filters: any) => {
    setState((prevState) => ({
      ...prevState,
      filters,
    }));
  }, []);

  const handlePageChange = useCallback((event: any, page: any) => {
    setState((prevState) => ({
      ...prevState,
      page,
    }));
  }, []);

  const handleRowsPerPageChange = useCallback((event: any) => {
    setState((prevState) => ({
      ...prevState,
      page: 0,
      rowsPerPage: parseInt(event.target.value, 10),
    }));

  }, []);

  const handleSortChange = useCallback((sortDir: any) => {
    setState((prevState) => ({
      ...prevState,
      sortDir,
    }));
  }, []);

  return {
    handleQueryChange,
    handleSortChange,
    handlePageChange,
    handleRowsPerPageChange,
    state,
  };
};

export const ClientListTable: FC<ClientListTableProps> = (props) => {

  const {
    count = 0,
    items = []
  } = props;

  const deleteClientsDialog = useDialog<DeleteClientsData>();
  const clientSearch = useClientSearch();

  const clientIds = useMemo(() => {
    if (!Array.isArray(props.items)) {
      return [];
    }
    return props.items.map((client: Client) => client.id);
  }, [props.items]);

  const handleDeleteClientsClick = useCallback((): void => {
    deleteClientsDialog.handleOpen();
  }, [deleteClientsDialog]);

  const [clientStore, setClientStore] = useState<Client[]>(items);

  const clientSelection = useSelection(clientIds);

  const selectedSome = clientSelection.selected.length > 0 && clientSelection.selected.length < clientIds.length;
  const selectedAll = items.length > 0 && clientSelection.selected.length === clientIds.length;
  const enableBulkActions = clientSelection.selected.length > 0;
  const { t } = useTranslation();



  return (
    <Box sx={{ position: 'relative' }}>
      {enableBulkActions && (
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: 'center',
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark' ? 'neutral.800' : 'neutral.50',
            display: enableBulkActions ? 'flex' : 'none',
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
          <Button
            color="inherit"
            size="small"
            onClick={handleDeleteClientsClick}
          >
            {t('common.btnDelete')}
          </Button>
          {
            clientSelection.selected.length === 1 &&
            <Button
              color="inherit"
              size="small"
            >
              {t('common.btnEdit')}
            </Button>
          }
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
              <TableCell >{t('clients.clientContactPerson')}/{t('clients.clientEmail')}</TableCell>
              <TableCell>{t('clients.clientName')}</TableCell>
              <TableCell>{t('clients.clientAddress1')}</TableCell>
              <TableCell >{t('clients.clientAddress2')}</TableCell>
              <TableCell>{t('clients.clientMobilePhone')}</TableCell>
              <TableCell>{t('clients.clientPhone')}</TableCell>
              <TableCell>{t('clients.clientType')}</TableCell>
              <TableCell>{t('clients.clientStatus')}</TableCell>
              <TableCell>{t('clients.clientIsVerified')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((client) => {
              const isSelected = clientSelection.selected.includes(client.id!);

              return (
                <TableRow
                  hover
                  key={client.id}
                  selected={isSelected}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                        if (event.target.checked) {
                          clientSelection.handleSelectOne(client.id!);
                        } else {
                          clientSelection.handleDeselectOne(client.id!);
                        }
                      }}
                      value={isSelected}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack
                      alignItems="center"
                      direction="row"
                      spacing={1}
                    >
                      <Avatar
                        src={client.avatar}
                        sx={{
                          height: 42,
                          width: 42,
                        }}
                      >
                        {getInitials(client.name)}
                      </Avatar>
                      <div>
                        <Link
                          color="inherit"
                          component={RouterLink}
                          href={paths.dashboard.clients.details}
                          variant="subtitle2"
                        >
                          {client.contact_person}
                        </Link>
                        <Typography
                          color="text.secondary"
                          variant="body2"
                        >
                          {client.email}
                        </Typography>
                      </div>
                    </Stack>
                  </TableCell>
                  <TableCell
                    sx={{
                      width: '200px',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}>
                    {client.name}
                  </TableCell>
                  <TableCell
                    sx={{
                      width: '300px',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}>
                    {client.address_1}
                  </TableCell>
                  <TableCell sx={{
                    width: '100px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>{client.address_2}</TableCell>
                  <TableCell>{client.mobile_phone}</TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell>{client.type}</TableCell>
                  <TableCell>{client.status}</TableCell>
                  <TableCell>
                    {
                      client.is_verified ?
                        <SvgIcon>
                          <CheckCircleIcon color='success' />
                        </SvgIcon> :
                        <SvgIcon>
                          <CancelIcon color='error' />
                        </SvgIcon>
                    }
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
      />
      <PopupModal
        isOpen={deleteClientsDialog.open}
        onClose={() => deleteClientsDialog.handleClose()}
        onConfirm={() => deleteClientsDialog.handleClose()}
        title={t('warning.deleteWarningTitle')}
        confirmText={t('common.btnDelete')}
        cancelText={t('common.btnClose')}
        children={t('warning.deleteWarningMessage')}
      />
    </Box >
  );
};

ClientListTable.propTypes = {
  count: PropTypes.number,
  items: PropTypes.array
};
