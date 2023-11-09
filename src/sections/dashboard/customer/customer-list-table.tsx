import { useState, type ChangeEvent, type FC, type MouseEvent } from 'react';
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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import { RouterLink } from 'src/components/router-link';
import { Scrollbar } from 'src/components/scrollbar';
import { paths } from 'src/paths';
import type { Customer } from 'src/types/customer';
import { getInitials } from 'src/utils/get-initials';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import Swal from 'sweetalert2';
import { Building } from '@/types/building';


interface CustomerQueryParams {
          page: number,
          rowsPerPage: number,
          sortBy: string,
          sortDir: string,
}

interface CustomerListTableProps {
          count?: number;
          items?: Customer[];
          allBuildings?: string[];
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
                    allBuildings = [],
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
          const router = useRouter();


          const handleTenantDeleteClick = () => {
                    Swal.fire({
                              title: 'Are you sure?',
                              text: "This action is irrevertable!",
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonColor: '#3085d6',
                              cancelButtonColor: '#d33',
                              confirmButtonText: 'Yes, delete tenants!'
                    }).then((result: any) => {
                              if (result.isConfirmed) {
                                        handleCustomersDelete(selected)
                              }
                    })
          }

          const handleCustomersDelete = async (customerIDs: string[]) => {
                    await fetch('/api/customers/customers-api', {
                              method: 'DELETE',
                              headers: {
                                        'Content-Type': 'application/json',
                                        'Access-Control-Allow-Origin': '*',
                                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // Set the content type to JSON
                              },
                              body: JSON.stringify({
                                        customerIDs: customerIDs,

                              })
                    }).then((res: any) => {
                              if (res.ok) {
                                        toast.success('Customer deleted');
                                        router.reload()
                              } else {
                                        const errorData = res.json(); // Parse the error response
                                        console.error(errorData);
                                        toast.error('Something went wrong!');
                                        //helpers.setStatus({ success: false });
                              }
                    })
          }

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
                                                            onClick={() => handleTenantDeleteClick()}
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
                                                                      <TableCell>Full Address</TableCell>
                                                                      <TableCell>Apartment number</TableCell>
                                                                      <TableCell>Owner</TableCell>
                                                            </TableRow>
                                                  </TableHead>
                                                  <TableBody>
                                                            {
                                                                      items.slice(page * rowsPerPage, (page * rowsPerPage) + rowsPerPage).map((customer) => {

                                                                                const isSelected = selected.includes(customer._id ? customer._id : '')
                                                                                const isOwnerColor = customer.isOwner === true ? 'success' : 'warning'
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
                                                                                                                                            onSelectOne?.(customer._id ? customer._id : '')
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
                                                                                                                        <Avatar
                                                                                                                                  src={customer.avatar}
                                                                                                                                  sx={{
                                                                                                                                            height: 42,
                                                                                                                                            width: 42,
                                                                                                                                  }}
                                                                                                                        >
                                                                                                                                  {getInitials(customer.firstName)}
                                                                                                                        </Avatar>
                                                                                                                        <Link
                                                                                                                                  color="inherit"
                                                                                                                                  variant="subtitle2"
                                                                                                                        >
                                                                                                                                  {customer.firstName}
                                                                                                                        </Link>
                                                                                                                        <Typography
                                                                                                                                  color="text.secondary"
                                                                                                                                  variant="body2"
                                                                                                                        >
                                                                                                                                  {customer.email}
                                                                                                                        </Typography>
                                                                                                              </Stack>
                                                                                                    </TableCell>
                                                                                                    <TableCell>
                                                                                                              <Stack
                                                                                                                        alignItems="center"
                                                                                                                        direction="row"
                                                                                                                        spacing={1}
                                                                                                              >
                                                                                                                        <div>
                                                                                                                                  <Link
                                                                                                                                            color="inherit"
                                                                                                                                            variant="subtitle2"
                                                                                                                                  >
                                                                                                                                            {customer.lastName}
                                                                                                                                  </Link>
                                                                                                                        </div>
                                                                                                              </Stack>
                                                                                                    </TableCell>
                                                                                                    <TableCell>
                                                                                                              <Stack
                                                                                                                        alignItems="center"
                                                                                                                        direction="row"
                                                                                                                        spacing={1}
                                                                                                              >
                                                                                                                        <div>
                                                                                                                                  <Link
                                                                                                                                            color="inherit"
                                                                                                                                            variant="subtitle2"
                                                                                                                                  >
                                                                                                                                            {customer.phoneNumber}
                                                                                                                                  </Link>
                                                                                                                        </div>
                                                                                                              </Stack>
                                                                                                    </TableCell>
                                                                                                    <TableCell>
                                                                                                              <Stack
                                                                                                                        alignItems="center"
                                                                                                                        direction="row"
                                                                                                                        spacing={1}
                                                                                                              >
                                                                                                                        <div>
                                                                                                                                  <Link
                                                                                                                                            color="inherit"
                                                                                                                                            variant="subtitle2"
                                                                                                                                  >
                                                                                                                                            {customer.avatar}
                                                                                                                                  </Link>
                                                                                                                        </div>
                                                                                                              </Stack>
                                                                                                    </TableCell>
                                                                                                    <TableCell>
                                                                                                              <Stack
                                                                                                                        alignItems="center"
                                                                                                                        direction="row"
                                                                                                                        spacing={1}
                                                                                                              >
                                                                                                                        {
                                                                                                                                  customer.isOwner ?
                                                                                                                                            <CheckCircleOutlineIcon color={isOwnerColor} />
                                                                                                                                            :
                                                                                                                                            <CancelIcon color={isOwnerColor} />
                                                                                                                        }
                                                                                                              </Stack>
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
