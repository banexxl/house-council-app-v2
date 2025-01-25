'use client'

import type { ChangeEvent, FC, MouseEvent } from 'react';
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

interface ClientListTableProps {
  count?: number;
  items?: Client[];
  onDeselectAll?: () => void;
  onDeselectOne?: (customerId: string) => void;
  onPageChange?: (event: MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
  onRowsPerPageChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onSelectAll?: () => void;
  onSelectOne?: (customerId: string) => void;
  page?: number;
  rowsPerPage?: number;
  selected?: string[];
}

export const ClientListTable: FC<ClientListTableProps> = (props) => {

  const {
    count = 0,
    items = [],
    onDeselectAll,
    onDeselectOne,
    onPageChange = () => { },
    onRowsPerPageChange,
    onSelectAll,
    onSelectOne,
    page = 0,
    rowsPerPage = 0,
    selected = [],
  } = props;

  const selectedSome = selected.length > 0 && selected.length < items.length;
  const selectedAll = items.length > 0 && selected.length === items.length;
  const enableBulkActions = selected.length > 0;
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
                onSelectAll?.();
              } else {
                onDeselectAll?.();
              }
            }}
          />
          <Button
            color="inherit"
            size="small"
          >
            {t('common.btnDelete')}
          </Button>
          <Button
            color="inherit"
            size="small"
          >
            {t('common.btnEdit')}
          </Button>
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
                      onSelectAll?.();
                    } else {
                      onDeselectAll?.();
                    }
                  }}
                />
              </TableCell>
              <TableCell>{t('clients.clientContactPerson')}/{t('clients.clientEmail')}</TableCell>
              <TableCell>{t('clients.clientName')}</TableCell>
              <TableCell>{t('clients.clientAddress1')}</TableCell>
              <TableCell sx={{
                width: '400px'
              }}>{t('clients.clientAddress2')}</TableCell>
              <TableCell>{t('clients.clientMobilePhone')}</TableCell>
              <TableCell>{t('clients.clientPhone')}</TableCell>
              <TableCell>{t('clients.clientType')}</TableCell>
              <TableCell>{t('clients.clientStatus')}</TableCell>
              <TableCell>{t('clients.clientIsVerified')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((client) => {
              const isSelected = selected.includes(client.id!);

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
                          onSelectOne?.(client.id!);
                        } else {
                          onDeselectOne?.(client.id!);
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
                  <TableCell>{client.name}</TableCell>
                  <TableCell>{client.address_1}</TableCell>
                  <TableCell sx={{
                    width: '400px'
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
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Box>
  );
};

ClientListTable.propTypes = {
  count: PropTypes.number,
  items: PropTypes.array,
  onDeselectAll: PropTypes.func,
  onDeselectOne: PropTypes.func,
  onPageChange: PropTypes.func,
  onRowsPerPageChange: PropTypes.func,
  onSelectAll: PropTypes.func,
  onSelectOne: PropTypes.func,
  page: PropTypes.number,
  rowsPerPage: PropTypes.number,
  selected: PropTypes.array,
};
