import type { ChangeEvent, FC, MouseEvent } from 'react';
import { Fragment, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';

import ChevronDownIcon from '@untitled-ui/icons-react/build/esm/ChevronDown';
import ChevronRightIcon from '@untitled-ui/icons-react/build/esm/ChevronRight';
import DotsHorizontalIcon from '@untitled-ui/icons-react/build/esm/DotsHorizontal';
import Image01Icon from '@untitled-ui/icons-react/build/esm/Image01';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { Scrollbar } from 'src/components/scrollbar';
import { SeverityPill } from 'src/components/severity-pill';
import type { Building } from 'src/types/building';

interface BuildingListTableProps {
  count?: number;
  items?: Building[];
  onPageChange?: (event: MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
  onRowsPerPageChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  page?: number;
  rowsPerPage?: number;
}

export const BuildingListTable: FC<BuildingListTableProps> = ({
  count = 0,
  items = [],
  onPageChange = () => { },
  onRowsPerPageChange,
  page = 0,
  rowsPerPage = 0,
}) => {
  const [currentBuilding, setCurrentBuilding] = useState<string | null>(null);

  const handleToggle = useCallback((id: string) => {
    setCurrentBuilding((prev) => (prev === id ? null : id));
  }, []);

  const handleClose = useCallback(() => {
    setCurrentBuilding(null);
  }, []);

  const handleUpdate = useCallback(() => {
    setCurrentBuilding(null);
    toast.success('Building updated');
  }, []);

  const handleDelete = useCallback(() => {
    toast.error('Building cannot be deleted');
  }, []);

  return (
    <div>
      <Scrollbar>
        <Table sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Name</TableCell>
              <TableCell>City</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((building) => {
              const isCurrent = building.id === currentBuilding;

              return (
                <Fragment key={building.id}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton onClick={() => handleToggle(building.id!)}>
                        <SvgIcon>{isCurrent ? <ChevronDownIcon /> : <ChevronRightIcon />}</SvgIcon>
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {building.cover_image ? (
                          <Box
                            sx={{
                              width: 64,
                              height: 64,
                              borderRadius: 1,
                              backgroundImage: `url(${building.cover_image})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              mr: 2,
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 64,
                              height: 64,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 1,
                              backgroundColor: 'neutral.100',
                              mr: 2,
                            }}
                          >
                            <SvgIcon>
                              <Image01Icon />
                            </SvgIcon>
                          </Box>
                        )}
                        <Box>
                          <Typography variant="subtitle2">{building.building_location?.street_address}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{building.building_location?.city}</TableCell>
                    <TableCell>{building.building_location?.street_address} {building.building_location?.street_number}</TableCell>
                    <TableCell>
                      <SeverityPill color={building.building_status === 'active' ? 'success' : 'warning'}>
                        {building.building_status}
                      </SeverityPill>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton>
                        <SvgIcon>
                          <DotsHorizontalIcon />
                        </SvgIcon>
                      </IconButton>
                    </TableCell>
                  </TableRow>

                  {isCurrent && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <CardContent>
                          <Grid container spacing={3}>xs={12} md={6}
                            <Grid size={{ xs: 12, md: 6 }}>
                              <Typography variant="h6">Basic Details</Typography>
                              <Divider sx={{ my: 2 }} />
                              <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <TextField fullWidth label="Name" defaultValue={building.building_location?.street_address} />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <TextField fullWidth label="City" defaultValue={building.building_location?.city} />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <TextField fullWidth label="Street Address" defaultValue={building.building_location?.street_address} />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <TextField fullWidth label="Street Number" defaultValue={building.building_location?.street_number} />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <TextField fullWidth label="Post Code" defaultValue={building.building_location?.post_code} />
                                </Grid>
                              </Grid>
                            </Grid>
                          </Grid>
                        </CardContent>
                        <Divider />
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ px: 2, py: 1 }}
                        >
                          <Stack direction="row" spacing={2}>
                            <Button variant="contained" onClick={handleUpdate}>
                              Update
                            </Button>
                            <Button color="inherit" onClick={handleClose}>
                              Cancel
                            </Button>
                          </Stack>
                          <Button color="error" onClick={handleDelete}>
                            Delete building
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Scrollbar>
      <TablePagination
        component="div"
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </div>
  );
};

BuildingListTable.propTypes = {
  count: PropTypes.number,
  items: PropTypes.array,
  onPageChange: PropTypes.func,
  onRowsPerPageChange: PropTypes.func,
  page: PropTypes.number,
  rowsPerPage: PropTypes.number,
};
