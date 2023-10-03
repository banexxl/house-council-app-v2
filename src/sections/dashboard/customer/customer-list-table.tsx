import type { ChangeEvent, FC, MouseEvent } from 'react';
import numeral from 'numeral';
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

import { RouterLink } from 'src/components/router-link';
import { Scrollbar } from 'src/components/scrollbar';
import { paths } from 'src/paths';
import type { Customer } from 'src/types/customer';
import { getInitials } from 'src/utils/get-initials';


interface CustomerQueryParams {
          page: number,
          rowsPerPage: number,
          sortBy: string,
          sortDir: string,
}

interface CustomerListTableProps {
          count?: number;
          items?: Customer[];
          onDeselectAll?: () => void;
          onDeselectOne?: (customerId: string) => void;
          onPageChange?: (event: MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
          onRowsPerPageChange?: (event: ChangeEvent<HTMLInputElement>) => void;
          onSelectAll?: () => void;
          onSelectOne?: (customerId: string) => void;
          page?: number;
          rowsPerPage?: number;
          selected?: string[];
          queryParams?: CustomerQueryParams;
}

export const CustomerListTable: FC<CustomerListTableProps> = (props) => {
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
          const enableEditAction = selected.length == 1

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

                                                  {
                                                            enableEditAction ?
                                                                      <Button
                                                                                color="inherit"
                                                                                size="small"
                                                                                component={RouterLink}
                                                                                href={`/dashboard/customers/edit/${selected[0]}`}
                                                                      >
                                                                                Edit
                                                                      </Button>
                                                                      : null
                                                  }
                                                  <Button
                                                            color="inherit"
                                                            size="small"

                                                  >
                                                            Delete
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
                                                                      <TableCell>First Name</TableCell>
                                                                      <TableCell>Second Name</TableCell>
                                                                      <TableCell>Street</TableCell>
                                                                      <TableCell>Appartment</TableCell>
                                                                      <TableCell>City</TableCell>
                                                                      <TableCell>Edit/Details</TableCell>
                                                            </TableRow>
                                                  </TableHead>
                                                  <TableBody>
                                                            {items.slice(page * rowsPerPage, (page * rowsPerPage) + rowsPerPage).map((customer) => {
                                                                      const isSelected = selected.includes(customer._id ? customer._id : '')
                                                                      //const location = `${customer.city}, ${customer.state}, ${customer.country}`;
                                                                      // const totalSpent = numeral(customer.totalSpent).format(`${customer.currency}0,0.00`);

                                                                      return (
                                                                                <TableRow
                                                                                          hover
                                                                                          key={customer._id}
                                                                                          selected={isSelected}
                                                                                >
                                                                                          <TableCell padding="checkbox">
                                                                                                    <Checkbox
                                                                                                              checked={isSelected}
                                                                                                              onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                                                                                                                        if (event.target.checked) {
                                                                                                                                  onSelectOne?.(customer._id ? customer._id : '');
                                                                                                                        } else {
                                                                                                                                  onDeselectOne?.(customer._id ? customer._id : '');
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
                                                                                                              {/* <Avatar
                                                                                                                        src={customer.avatar}
                                                                                                                        sx={{
                                                                                                                                  height: 42,
                                                                                                                                  width: 42,
                                                                                                                        }}
                                                                                                              >
                                                                                                                        {getInitials(customer.firstName)}
                                                                                                              </Avatar> */}
                                                                                                              <div>
                                                                                                                        <Link
                                                                                                                                  color="inherit"
                                                                                                                                  variant="subtitle2"
                                                                                                                        >
                                                                                                                                  {customer.firstName}
                                                                                                                        </Link>
                                                                                                                        {/* <Typography
                                                                                                                                  color="text.secondary"
                                                                                                                                  variant="body2"
                                                                                                                        >
                                                                                                                                  {customer.email}
                                                                                                                        </Typography> */}
                                                                                                              </div>
                                                                                                    </Stack>
                                                                                          </TableCell>
                                                                                          <TableCell>
                                                                                                    <Stack
                                                                                                              alignItems="center"
                                                                                                              direction="row"
                                                                                                              spacing={1}
                                                                                                    >
                                                                                                              {/* <Avatar
                                                                                                                        src={customer.avatar}
                                                                                                                        sx={{
                                                                                                                                  height: 42,
                                                                                                                                  width: 42,
                                                                                                                        }}
                                                                                                              >
                                                                                                                        {getInitials(customer.firstName)}
                                                                                                              </Avatar> */}
                                                                                                              <div>
                                                                                                                        <Link
                                                                                                                                  color="inherit"
                                                                                                                                  variant="subtitle2"
                                                                                                                        >
                                                                                                                                  {customer.lastName}
                                                                                                                        </Link>
                                                                                                                        {/* <Typography
                                                                                                                                  color="text.secondary"
                                                                                                                                  variant="body2"
                                                                                                                        >
                                                                                                                                  {customer.email}
                                                                                                                        </Typography> */}
                                                                                                              </div>
                                                                                                    </Stack>
                                                                                          </TableCell>
                                                                                          <TableCell>
                                                                                                    <Stack
                                                                                                              alignItems="center"
                                                                                                              direction="row"
                                                                                                              spacing={1}
                                                                                                    >
                                                                                                              {/* <Avatar
                                                                                                                        src={customer.avatar}
                                                                                                                        sx={{
                                                                                                                                  height: 42,
                                                                                                                                  width: 42,
                                                                                                                        }}
                                                                                                              >
                                                                                                                        {getInitials(customer.firstName)}
                                                                                                              </Avatar> */}
                                                                                                              <div>
                                                                                                                        <Link
                                                                                                                                  color="inherit"
                                                                                                                                  variant="subtitle2"
                                                                                                                        >
                                                                                                                                  {customer.address1}
                                                                                                                        </Link>
                                                                                                                        {/* <Typography
                                                                                                                                  color="text.secondary"
                                                                                                                                  variant="body2"
                                                                                                                        >
                                                                                                                                  {customer.email}
                                                                                                                        </Typography> */}
                                                                                                              </div>
                                                                                                    </Stack>
                                                                                          </TableCell>
                                                                                          <TableCell>
                                                                                                    <Stack
                                                                                                              alignItems="center"
                                                                                                              direction="row"
                                                                                                              spacing={1}
                                                                                                    >
                                                                                                              {/* <Avatar
                                                                                                                        src={customer.avatar}
                                                                                                                        sx={{
                                                                                                                                  height: 42,
                                                                                                                                  width: 42,
                                                                                                                        }}
                                                                                                              >
                                                                                                                        {getInitials(customer.firstName)}
                                                                                                              </Avatar> */}
                                                                                                              <div>
                                                                                                                        <Link
                                                                                                                                  color="inherit"
                                                                                                                                  variant="subtitle2"
                                                                                                                        >
                                                                                                                                  {customer.appartmentNumber}
                                                                                                                        </Link>
                                                                                                                        {/* <Typography
                                                                                                                                  color="text.secondary"
                                                                                                                                  variant="body2"
                                                                                                                        >
                                                                                                                                  {customer.email}
                                                                                                                        </Typography> */}
                                                                                                              </div>
                                                                                                    </Stack>
                                                                                          </TableCell>
                                                                                          <TableCell>
                                                                                                    <Stack
                                                                                                              alignItems="center"
                                                                                                              direction="row"
                                                                                                              spacing={1}
                                                                                                    >
                                                                                                              {/* <Avatar
                                                                                                                        src={customer.avatar}
                                                                                                                        sx={{
                                                                                                                                  height: 42,
                                                                                                                                  width: 42,
                                                                                                                        }}
                                                                                                              >
                                                                                                                        {getInitials(customer.firstName)}
                                                                                                              </Avatar> */}
                                                                                                              <div>
                                                                                                                        <Link
                                                                                                                                  color="inherit"
                                                                                                                                  variant="subtitle2"
                                                                                                                        >
                                                                                                                                  {customer.city}
                                                                                                                        </Link>
                                                                                                                        {/* <Typography
                                                                                                                                  color="text.secondary"
                                                                                                                                  variant="body2"
                                                                                                                        >
                                                                                                                                  {customer.email}
                                                                                                                        </Typography> */}
                                                                                                              </div>
                                                                                                    </Stack>
                                                                                          </TableCell>
                                                                                          <TableCell>
                                                                                                    <IconButton
                                                                                                    >
                                                                                                              <SvgIcon>
                                                                                                                        <Edit02Icon />
                                                                                                              </SvgIcon>
                                                                                                    </IconButton>
                                                                                                    <IconButton
                                                                                                    >
                                                                                                              <SvgIcon>
                                                                                                                        <ArrowRightIcon />
                                                                                                              </SvgIcon>
                                                                                                    </IconButton>
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

CustomerListTable.propTypes = {
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
