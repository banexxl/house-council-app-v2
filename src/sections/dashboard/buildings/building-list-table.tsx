import type { ChangeEvent, FC, MouseEvent } from 'react';
import { Fragment, useCallback, useState } from 'react';
import numeral from 'numeral';
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
import LinearProgress from '@mui/material/LinearProgress';
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
import type { Building } from '@/types/building';

interface CategoryOption {
          label: string;
          value: string;
}

const categoryOptions: CategoryOption[] = [
          {
                    label: 'Healthcare',
                    value: 'healthcare',
          },
          {
                    label: 'Makeup',
                    value: 'makeup',
          },
          {
                    label: 'Dress',
                    value: 'dress',
          },
          {
                    label: 'Skincare',
                    value: 'skincare',
          },
          {
                    label: 'Jewelry',
                    value: 'jewelry',
          },
          {
                    label: 'Blouse',
                    value: 'blouse',
          },
];

interface BuildingListTableProps {
          count?: number;
          items?: Building[];
          onPageChange?: (event: MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
          onRowsPerPageChange?: (event: ChangeEvent<HTMLInputElement>) => void;
          page?: number;
          rowsPerPage?: number;
}

export const BuildingListTable: FC<BuildingListTableProps> = (props) => {
          console.log('building table list props', props);

          const {
                    count = 0,
                    items = [],
                    onPageChange = () => { },
                    onRowsPerPageChange,
                    page = 0,
                    rowsPerPage = 0,
          } = props;
          const [currentBuilding, setCurrentBuilding] = useState<string | null>(null);

          const handleBuildingToggle = useCallback((buildingId: string): void => {
                    setCurrentBuilding((prevBuildingId) => {
                              if (prevBuildingId === buildingId) {
                                        return null;
                              }

                              return buildingId;
                    });
          }, []);

          const handleBuildingClose = useCallback((): void => {
                    setCurrentBuilding(null);
          }, []);

          const handleBuildingUpdate = useCallback((): void => {
                    setCurrentBuilding(null);
                    toast.success('Building updated');
          }, []);

          const handleBuildingDelete = useCallback((): void => {
                    toast.error('Building cannot be deleted');
          }, []);

          return (
                    <div>
                              <Scrollbar>
                                        <Table sx={{ minWidth: 1200 }}>
                                                  <TableHead>
                                                            <TableRow>
                                                                      <TableCell />
                                                                      <TableCell>City</TableCell>
                                                                      <TableCell>Street</TableCell>
                                                                      <TableCell>Street number</TableCell>
                                                                      <TableCell>Appartment Count</TableCell>
                                                                      <TableCell>Unresolved issue count</TableCell>
                                                                      <TableCell>Elevator</TableCell>
                                                                      <TableCell>Appartment Count</TableCell>
                                                                      <TableCell>Stories high</TableCell>
                                                            </TableRow>
                                                  </TableHead>
                                                  <TableBody>
                                                            {items.map((building) => {
                                                                      const isCurrent = building._id === currentBuilding;
                                                                      const issueCountColor = building.issueCount >= 10 ? 'success' : 'error';
                                                                      const hasElevatorColor = building.hasOwnElevator === true ? 'success' : 'info';
                                                                      // const hasManyVariants = building.variants > 1;

                                                                      return (
                                                                                <Fragment key={building._id}>
                                                                                          <TableRow
                                                                                                    hover
                                                                                                    key={building._id}
                                                                                          >
                                                                                                    <TableCell
                                                                                                              padding="checkbox"
                                                                                                              sx={{
                                                                                                                        ...(isCurrent && {
                                                                                                                                  position: 'relative',
                                                                                                                                  '&:after': {
                                                                                                                                            position: 'absolute',
                                                                                                                                            content: '" "',
                                                                                                                                            top: 0,
                                                                                                                                            left: 0,
                                                                                                                                            backgroundColor: 'primary.main',
                                                                                                                                            width: 3,
                                                                                                                                            height: 'calc(100% + 1px)',
                                                                                                                                  },
                                                                                                                        }),
                                                                                                              }}
                                                                                                              width="25%"
                                                                                                    >
                                                                                                              <IconButton onClick={() => handleBuildingToggle(building._id!)}>
                                                                                                                        <SvgIcon>{isCurrent ? <ChevronDownIcon /> : <ChevronRightIcon />}</SvgIcon>
                                                                                                              </IconButton>
                                                                                                    </TableCell>
                                                                                                    <TableCell>{building.street}</TableCell>
                                                                                                    <TableCell>{building.streetNumber}</TableCell>
                                                                                                    {/* image */}
                                                                                                    <TableCell width="25%">
                                                                                                              <Box
                                                                                                                        sx={{
                                                                                                                                  alignItems: 'center',
                                                                                                                                  display: 'flex',
                                                                                                                        }}
                                                                                                              >
                                                                                                                        {/* {building.image ? (
                                                                                                                                  <Box
                                                                                                                                            sx={{
                                                                                                                                                      alignItems: 'center',
                                                                                                                                                      backgroundColor: 'neutral.50',
                                                                                                                                                      backgroundImage: `url(${building.image})`,
                                                                                                                                                      backgroundPosition: 'center',
                                                                                                                                                      backgroundSize: 'cover',
                                                                                                                                                      borderRadius: 1,
                                                                                                                                                      display: 'flex',
                                                                                                                                                      height: 80,
                                                                                                                                                      justifyContent: 'center',
                                                                                                                                                      overflow: 'hidden',
                                                                                                                                                      width: 80,
                                                                                                                                            }}
                                                                                                                                  />
                                                                                                                        ) : (
                                                                                                                                  <Box
                                                                                                                                            sx={{
                                                                                                                                                      alignItems: 'center',
                                                                                                                                                      backgroundColor: 'neutral.50',
                                                                                                                                                      borderRadius: 1,
                                                                                                                                                      display: 'flex',
                                                                                                                                                      height: 80,
                                                                                                                                                      justifyContent: 'center',
                                                                                                                                                      width: 80,
                                                                                                                                            }}
                                                                                                                                  >
                                                                                                                                            <SvgIcon>
                                                                                                                                                      <Image01Icon />
                                                                                                                                            </SvgIcon>
                                                                                                                                  </Box>
                                                                                                                        )} */}
                                                                                                                        <Box
                                                                                                                                  sx={{
                                                                                                                                            cursor: 'pointer',
                                                                                                                                            ml: 2,
                                                                                                                                  }}
                                                                                                                        >
                                                                                                                                  <Typography variant="subtitle2">{building.city}</Typography>
                                                                                                                                  <Typography
                                                                                                                                            color="text.secondary"
                                                                                                                                            variant="body2"
                                                                                                                                  >
                                                                                                                                            in {building.country}
                                                                                                                                  </Typography>
                                                                                                                        </Box>
                                                                                                              </Box>
                                                                                                    </TableCell>
                                                                                                    <TableCell>{building.appartmentCount}</TableCell>

                                                                                                    {/* <TableCell width="25%">
                                                                                                              <LinearProgress
                                                                                                                        value={building.unresolvedIssues.length}
                                                                                                                        variant="determinate"
                                                                                                                        color={issueCountColor}
                                                                                                                        sx={{
                                                                                                                                  height: 8,
                                                                                                                                  width: 36,
                                                                                                                        }}
                                                                                                              />
                                                                                                              <Typography
                                                                                                                        color="text.secondary"
                                                                                                                        variant="body2"
                                                                                                              >
                                                                                                                        {building.unresolvedIssues.length} unresolved issues <br />
                                                                                                                        out of {building.allReportedIssues.length}
                                                                                                              </Typography>
                                                                                                    </TableCell> */}
                                                                                                    <TableCell>
                                                                                                              <SeverityPill color={hasElevatorColor}>{building.hasOwnElevator}</SeverityPill>
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
                                                                                                              <TableCell
                                                                                                                        colSpan={7}
                                                                                                                        sx={{
                                                                                                                                  p: 0,
                                                                                                                                  position: 'relative',
                                                                                                                                  '&:after': {
                                                                                                                                            position: 'absolute',
                                                                                                                                            content: '" "',
                                                                                                                                            top: 0,
                                                                                                                                            left: 0,
                                                                                                                                            backgroundColor: 'primary.main',
                                                                                                                                            width: 3,
                                                                                                                                            height: 'calc(100% + 1px)',
                                                                                                                                  },
                                                                                                                        }}
                                                                                                              >
                                                                                                                        <CardContent>
                                                                                                                                  <Grid
                                                                                                                                            container
                                                                                                                                            spacing={3}
                                                                                                                                  >
                                                                                                                                            <Grid
                                                                                                                                                      item
                                                                                                                                                      md={6}
                                                                                                                                                      xs={12}
                                                                                                                                            >
                                                                                                                                                      <Typography variant="h6">Basic details</Typography>
                                                                                                                                                      <Divider sx={{ my: 2 }} />
                                                                                                                                                      <Grid
                                                                                                                                                                container
                                                                                                                                                                spacing={3}
                                                                                                                                                      >
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <TextField
                                                                                                                                                                                    defaultValue={building.fullAddress}
                                                                                                                                                                                    fullWidth
                                                                                                                                                                                    label="Building name"
                                                                                                                                                                                    name="name"
                                                                                                                                                                          />
                                                                                                                                                                </Grid>
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <TextField
                                                                                                                                                                                    defaultValue={building.street}
                                                                                                                                                                                    disabled
                                                                                                                                                                                    fullWidth
                                                                                                                                                                                    label="SKU"
                                                                                                                                                                                    name="sku"
                                                                                                                                                                          />
                                                                                                                                                                </Grid>
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <TextField
                                                                                                                                                                                    defaultValue={building.streetNumber}
                                                                                                                                                                                    fullWidth
                                                                                                                                                                                    label="Category"
                                                                                                                                                                                    select
                                                                                                                                                                          >
                                                                                                                                                                                    {categoryOptions.map((option) => (
                                                                                                                                                                                              <MenuItem
                                                                                                                                                                                                        key={option.value}
                                                                                                                                                                                                        value={option.value}
                                                                                                                                                                                              >
                                                                                                                                                                                                        {option.label}
                                                                                                                                                                                              </MenuItem>
                                                                                                                                                                                    ))}
                                                                                                                                                                          </TextField>
                                                                                                                                                                </Grid>
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <TextField
                                                                                                                                                                                    defaultValue={building._id}
                                                                                                                                                                                    disabled
                                                                                                                                                                                    fullWidth
                                                                                                                                                                                    label="Barcode"
                                                                                                                                                                                    name="barcode"
                                                                                                                                                                          />
                                                                                                                                                                </Grid>
                                                                                                                                                      </Grid>
                                                                                                                                            </Grid>
                                                                                                                                            <Grid
                                                                                                                                                      item
                                                                                                                                                      md={6}
                                                                                                                                                      xs={12}
                                                                                                                                            >
                                                                                                                                                      <Typography variant="h6">Pricing and stocks</Typography>
                                                                                                                                                      <Divider sx={{ my: 2 }} />
                                                                                                                                                      <Grid
                                                                                                                                                                container
                                                                                                                                                                spacing={3}
                                                                                                                                                      >
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <TextField
                                                                                                                                                                                    defaultValue={building.tenantCount}
                                                                                                                                                                                    fullWidth
                                                                                                                                                                                    label="Old price"
                                                                                                                                                                                    name="old-price"
                                                                                                                                                                                    InputProps={{
                                                                                                                                                                                              startAdornment: (
                                                                                                                                                                                                        <InputAdornment position="start">
                                                                                                                                                                                                                  {building.tenantCount}
                                                                                                                                                                                                        </InputAdornment>
                                                                                                                                                                                              ),
                                                                                                                                                                                    }}
                                                                                                                                                                                    type="number"
                                                                                                                                                                          />
                                                                                                                                                                </Grid>
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <TextField
                                                                                                                                                                                    defaultValue={building.tenantMeetings}
                                                                                                                                                                                    fullWidth
                                                                                                                                                                                    label="New price"
                                                                                                                                                                                    name="new-price"
                                                                                                                                                                                    InputProps={{
                                                                                                                                                                                              startAdornment: (
                                                                                                                                                                                                        <InputAdornment position="start">$</InputAdornment>
                                                                                                                                                                                              ),
                                                                                                                                                                                    }}
                                                                                                                                                                                    type="number"
                                                                                                                                                                          />
                                                                                                                                                                </Grid>
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                          sx={{
                                                                                                                                                                                    alignItems: 'center',
                                                                                                                                                                                    display: 'flex',
                                                                                                                                                                          }}
                                                                                                                                                                >
                                                                                                                                                                          <Switch />
                                                                                                                                                                          <Typography variant="subtitle2">
                                                                                                                                                                                    Keep selling when stock is empty
                                                                                                                                                                          </Typography>
                                                                                                                                                                </Grid>
                                                                                                                                                      </Grid>
                                                                                                                                            </Grid>
                                                                                                                                  </Grid>
                                                                                                                        </CardContent>
                                                                                                                        <Divider />
                                                                                                                        <Stack
                                                                                                                                  alignItems="center"
                                                                                                                                  direction="row"
                                                                                                                                  justifyContent="space-between"
                                                                                                                                  sx={{ p: 2 }}
                                                                                                                        >
                                                                                                                                  <Stack
                                                                                                                                            alignItems="center"
                                                                                                                                            direction="row"
                                                                                                                                            spacing={2}
                                                                                                                                  >
                                                                                                                                            <Button
                                                                                                                                                      onClick={handleBuildingUpdate}
                                                                                                                                                      type="submit"
                                                                                                                                                      variant="contained"
                                                                                                                                            >
                                                                                                                                                      Update
                                                                                                                                            </Button>
                                                                                                                                            <Button
                                                                                                                                                      color="inherit"
                                                                                                                                                      onClick={handleBuildingClose}
                                                                                                                                            >
                                                                                                                                                      Cancel
                                                                                                                                            </Button>
                                                                                                                                  </Stack>
                                                                                                                                  <div>
                                                                                                                                            <Button
                                                                                                                                                      onClick={handleBuildingDelete}
                                                                                                                                                      color="error"
                                                                                                                                            >
                                                                                                                                                      Delete building
                                                                                                                                            </Button>
                                                                                                                                  </div>
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
                                        onPageChange={onPageChange}
                                        onRowsPerPageChange={onRowsPerPageChange}
                                        page={page}
                                        rowsPerPage={rowsPerPage}
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
