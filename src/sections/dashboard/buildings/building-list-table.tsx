import type { ChangeEvent, FC, MouseEvent } from 'react';
import { Fragment, useState } from 'react';
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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import { Scrollbar } from 'src/components/scrollbar';
import { SeverityPill } from 'src/components/severity-pill';
import type { Building } from '@/types/building';
import { Checkbox, FormControlLabel } from '@mui/material';
import { QuillEditor } from '@/components/quill-editor';
import { initialValues, validationSchema } from './building-options';
import { paths } from '@/paths';
import { useRouter } from 'next/router';
import Swal from 'sweetalert2';

interface BuildingListTableProps {
          count?: number;
          items?: Building[];
          onPageChange?: (event: MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
          onRowsPerPageChange?: (event: ChangeEvent<HTMLInputElement>) => void;
          onDeselectOne?: (item: unknown) => void;
          onSelectOne?: (item: unknown) => void;
          selected?: Building[];
          page?: number;
          rowsPerPage?: number;
}

export const BuildingListTable: FC<BuildingListTableProps> = (props) => {

          const [currentBuildingObject, setCurrentBuildingObject] = useState<Building | null>();

          const router = useRouter();

          const {
                    count = 0,
                    items = [],
                    onPageChange = () => { },
                    onRowsPerPageChange,
                    page = 0,
                    rowsPerPage = 0,
                    selected = []
          } = props;

          const [currentBuilding, setCurrentBuilding] = useState<string | null>(null);

          const getObjectById = (_id: any, arrayToSearch: any) => {
                    for (const obj of arrayToSearch) {
                              if (obj._id === _id) {
                                        return obj;  // Found the object with the desired ID
                              }
                    }
                    return null;  // Object with the desired ID not found
          }

          const handleBuildingToggle = (buildingId: string): void => {
                    setCurrentBuilding((prevBuildingId) => {
                              if (prevBuildingId === buildingId) {
                                        setCurrentBuildingObject(null)
                                        return null;
                              }
                              const map = new Map(items.map((obj: Building) => [obj._id, obj]));
                              const result = map.get(buildingId);

                              setCurrentBuildingObject(result)
                              return buildingId;
                    });
          }

          const handleBuildingClose = (): void => {
                    setCurrentBuilding(null);
          }

          const handleBuildingUpdateClick = () => {
                    Swal.fire({
                              title: 'Are you sure?',
                              text: "You can edit this Building at any time!",
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonColor: '#3085d6',
                              cancelButtonColor: '#d33',
                              confirmButtonText: 'Yes, update it!'
                    }).then((result: any) => {
                              if (result.isConfirmed) {
                                        handleBuildingUpdate(currentBuildingObject)
                              }
                    })
          }

          const handleBuildingUpdate = async (currentBuildingObject: any) => {
                    try {
                              const buildingCreateResponse = await fetch('/api/buildings/update-building-api', {
                                        method: 'PUT',
                                        headers: {
                                                  'Content-Type': 'application/json',
                                                  'Access-Control-Allow-Origin': '*',
                                                  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // Set the content type to JSON
                                        },
                                        body: JSON.stringify(currentBuildingObject), // Convert your data to JSON
                              }).then(async (response) => {

                                        if (response.ok) {
                                                  toast.success('Building updated');
                                                  router.push(paths.dashboard.buildings.index);
                                                  setCurrentBuilding(null)
                                        } else {
                                                  const errorData = await response.json(); // Parse the error response
                                                  console.error(errorData);
                                                  toast.error('Something went wrong!');
                                        }
                              })
                    } catch (err) {
                              console.error(err);
                              toast.error('Something went wrong!');
                              // helpers.setStatus({ success: false });
                              // //helpers.setErrors({ submit: err.message });
                              // helpers.setSubmitting(false);
                    }
          }

          const handleBuildingDeleteClick = () => {
                    Swal.fire({
                              title: 'Are you sure?',
                              text: "Deleting a building cannot be undone!",
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonColor: '#3085d6',
                              cancelButtonColor: '#d33',
                              confirmButtonText: 'Yes, delete it!'
                    }).then((result: any) => {
                              if (result.isConfirmed) {
                                        handleBuildingDelete(currentBuildingObject)
                              }
                    })
          }

          const handleBuildingDelete = async (currentBuildingObject: any) => {
                    try {
                              const deleteBuildingResponse = await fetch('/api/buildings/buildings-api', {
                                        method: 'DELETE',
                                        headers: {
                                                  'Content-Type': 'application/json',
                                                  'Access-Control-Allow-Origin': '*',
                                                  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // Set the content type to JSON
                                        },
                                        body: JSON.stringify(currentBuildingObject), // Convert your data to JSON
                              }).then(async (response) => {
                                        if (response.ok) {
                                                  toast.success('Building deleted!');
                                                  router.push(paths.dashboard.buildings.index);
                                                  setCurrentBuilding(null)
                                        } else {
                                                  const errorData = await response.json(); // Parse the error response
                                                  console.error(errorData);
                                                  toast.error('Something went wrong!');
                                        }
                              })
                              console.log(deleteBuildingResponse);

                    } catch (err) {
                              console.error(err);
                              toast.error('Something went wrong!');
                              // helpers.setStatus({ success: false });
                              // //helpers.setErrors({ submit: err.message });
                              // helpers.setSubmitting(false);
                    }
          }


          return (
                    <Box>
                              <Scrollbar>
                                        <Table sx={{ minWidth: 1200 }}>
                                                  <TableHead>
                                                            <TableRow>
                                                                      <TableCell />
                                                                      <TableCell>City</TableCell>
                                                                      <TableCell>Street</TableCell>
                                                                      <TableCell>Street number</TableCell>
                                                                      <TableCell>Unresolved issue count</TableCell>
                                                                      <TableCell>Elevator</TableCell>
                                                                      <TableCell>Appartment Count</TableCell>
                                                            </TableRow>
                                                  </TableHead>
                                                  <TableBody>
                                                            {
                                                                      items.slice(page * rowsPerPage, (page * rowsPerPage) + rowsPerPage).map((building: Building) => {
                                                                                const isCurrent = building._id === currentBuilding;
                                                                                // const issueCountColor = building.unresolvedIssues.length >= 10 ? 'success' : 'error';
                                                                                const hasElevatorColor = building.hasOwnElevator === true ? 'success' : 'error';
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
                                                                                                              <TableCell>{building.city}</TableCell>
                                                                                                              <TableCell>{building.street}</TableCell>
                                                                                                              <TableCell>{building.streetNumber}</TableCell>
                                                                                                              <TableCell>
                                                                                                                        {/* <LinearProgress
                                                                                                                        value={building.unresolvedIssues.length}
                                                                                                                        variant="determinate"
                                                                                                                        color={issueCountColor}
                                                                                                                        sx={{
                                                                                                                                  height: 8,
                                                                                                                                  width: 36,
                                                                                                                        }}
                                                                                                              /> */}
                                                                                                                        {/* <Typography
                                                                                                                        color="text.secondary"
                                                                                                                        variant="body2"
                                                                                                              >
                                                                                                                        {building.unresolvedIssues.length} unresolved issues <br />
                                                                                                                        out of {building.unresolvedIssues.length}
                                                                                                              </Typography> */}
                                                                                                              </TableCell>
                                                                                                              <TableCell>
                                                                                                                        {
                                                                                                                                  building.hasOwnElevator ?
                                                                                                                                            <CheckCircleOutlineIcon color={hasElevatorColor} />
                                                                                                                                            :
                                                                                                                                            <CancelIcon color={hasElevatorColor} />
                                                                                                                        }
                                                                                                              </TableCell>
                                                                                                              <TableCell>{building.appartmentCount}</TableCell>
                                                                                                    </TableRow>

                                                                                                    {
                                                                                                              isCurrent && (
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
                                                                                                                                                                          <Typography variant="h6">Basic Info</Typography>
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
                                                                                                                                                                                                        defaultValue={building._id}
                                                                                                                                                                                                        fullWidth
                                                                                                                                                                                                        label="Building ID"
                                                                                                                                                                                                        name="_id"
                                                                                                                                                                                                        disabled
                                                                                                                                                                                                        onLoad={(e: any) =>
                                                                                                                                                                                                                  setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                            ...previousObject,
                                                                                                                                                                                                                            street: e.target.value
                                                                                                                                                                                                                  }))}
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={6}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <TextField
                                                                                                                                                                                                        defaultValue={building.street}
                                                                                                                                                                                                        fullWidth
                                                                                                                                                                                                        label="Building street"
                                                                                                                                                                                                        name="street"
                                                                                                                                                                                                        onChange={(e: any) =>
                                                                                                                                                                                                                  setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                            ...previousObject,
                                                                                                                                                                                                                            street: e.target.value
                                                                                                                                                                                                                  }))
                                                                                                                                                                                                        }
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
                                                                                                                                                                                                        label="Building street number"
                                                                                                                                                                                                        name="streetNumber"
                                                                                                                                                                                                        onChange={(e: any) =>
                                                                                                                                                                                                                  setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                            ...previousObject,
                                                                                                                                                                                                                            streetNumber: parseInt(e.target.value)

                                                                                                                                                                                                                  }))
                                                                                                                                                                                                        }
                                                                                                                                                                                                        type='number'
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={6}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <TextField
                                                                                                                                                                                                        defaultValue={building.city}
                                                                                                                                                                                                        fullWidth
                                                                                                                                                                                                        label="Building city"
                                                                                                                                                                                                        name="city"
                                                                                                                                                                                                        onChange={(e: any) =>
                                                                                                                                                                                                                  setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                            ...previousObject,
                                                                                                                                                                                                                            city: e.target.value

                                                                                                                                                                                                                  }))
                                                                                                                                                                                                        }
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={6}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <TextField
                                                                                                                                                                                                        defaultValue={building.country}
                                                                                                                                                                                                        fullWidth
                                                                                                                                                                                                        label="Building country"
                                                                                                                                                                                                        name="country"
                                                                                                                                                                                                        onChange={(e: any) =>
                                                                                                                                                                                                                  setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                            ...previousObject,
                                                                                                                                                                                                                            country: e.target.value

                                                                                                                                                                                                                  }))
                                                                                                                                                                                                        }
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={6}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <TextField
                                                                                                                                                                                                        defaultValue={building.region}
                                                                                                                                                                                                        fullWidth
                                                                                                                                                                                                        label="Building region"
                                                                                                                                                                                                        name="region"
                                                                                                                                                                                                        onChange={(e: any) =>
                                                                                                                                                                                                                  setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                            ...previousObject,
                                                                                                                                                                                                                            region: e.target.value
                                                                                                                                                                                                                  }))
                                                                                                                                                                                                        }
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={6}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <TextField
                                                                                                                                                                                                        defaultValue={building.storiesHigh}
                                                                                                                                                                                                        onChange={(e: any) =>
                                                                                                                                                                                                                  setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                            ...previousObject,
                                                                                                                                                                                                                            storiesHigh: parseInt(e.target.value)
                                                                                                                                                                                                                  }))
                                                                                                                                                                                                        }
                                                                                                                                                                                                        fullWidth
                                                                                                                                                                                                        label="Building stories high"
                                                                                                                                                                                                        name="storiesHigh"
                                                                                                                                                                                                        type='number'
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={6}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <TextField
                                                                                                                                                                                                        defaultValue={building.appartmentCount}
                                                                                                                                                                                                        onChange={(e: any) =>
                                                                                                                                                                                                                  setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                            ...previousObject,
                                                                                                                                                                                                                            appartmentCount: parseInt(e.target.value)
                                                                                                                                                                                                                  }))
                                                                                                                                                                                                        }
                                                                                                                                                                                                        fullWidth
                                                                                                                                                                                                        label="Building appartment count"
                                                                                                                                                                                                        name="appartmentCount"
                                                                                                                                                                                                        type='number'
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={6}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <FormControlLabel
                                                                                                                                                                                                        control={
                                                                                                                                                                                                                  <Checkbox
                                                                                                                                                                                                                            checked={building.isRecentlyBuilt}
                                                                                                                                                                                                                            name='isRecentlyBuilt'
                                                                                                                                                                                                                            onChange={(e: any) => {
                                                                                                                                                                                                                                      setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                                                ...previousObject,
                                                                                                                                                                                                                                                isRecentlyBuilt: e.target.checked
                                                                                                                                                                                                                                      }))
                                                                                                                                                                                                                                      building.isRecentlyBuilt = !building.isRecentlyBuilt
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                  />
                                                                                                                                                                                                        }
                                                                                                                                                                                                        label="Is recently built"
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={6}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <FormControlLabel
                                                                                                                                                                                                        control={
                                                                                                                                                                                                                  <Checkbox
                                                                                                                                                                                                                            checked={building.buildingStatus}
                                                                                                                                                                                                                            name='buildingStatus'
                                                                                                                                                                                                                            onChange={(e: any) => {
                                                                                                                                                                                                                                      setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                                                ...previousObject,
                                                                                                                                                                                                                                                buildingStatus: e.target.checked
                                                                                                                                                                                                                                      }))
                                                                                                                                                                                                                                      building.buildingStatus = !building.buildingStatus
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                  />
                                                                                                                                                                                                        }
                                                                                                                                                                                                        label="Active"
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={12}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <Typography
                                                                                                                                                                                                        color="text.secondary"
                                                                                                                                                                                                        sx={{ mb: 2 }}
                                                                                                                                                                                                        variant="subtitle2"
                                                                                                                                                                                              >
                                                                                                                                                                                                        Description
                                                                                                                                                                                              </Typography>
                                                                                                                                                                                              <QuillEditor
                                                                                                                                                                                                        defaultValue={building.description}
                                                                                                                                                                                                        placeholder="Short description"
                                                                                                                                                                                                        sx={{ height: 400 }}
                                                                                                                                                                                                        onChange={(e: any) =>
                                                                                                                                                                                                                  setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                            ...previousObject,
                                                                                                                                                                                                                            description: e
                                                                                                                                                                                                                  }))
                                                                                                                                                                                                        }
                                                                                                                                                                                                        style={{
                                                                                                                                                                                                                  height: '200px'
                                                                                                                                                                                                        }}
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                          </Grid>
                                                                                                                                                                </Grid>
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <Typography variant="h6">Detailed Info</Typography>
                                                                                                                                                                          <Divider sx={{ my: 2 }} />
                                                                                                                                                                          <Grid
                                                                                                                                                                                    container
                                                                                                                                                                                    spacing={4.5}
                                                                                                                                                                          >
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={6}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <FormControlLabel
                                                                                                                                                                                                        control={
                                                                                                                                                                                                                  <Checkbox
                                                                                                                                                                                                                            checked={building.hasCentralHeating}
                                                                                                                                                                                                                            name='hasCentralHeating'
                                                                                                                                                                                                                            onChange={(e: any) => {
                                                                                                                                                                                                                                      setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                                                ...previousObject,
                                                                                                                                                                                                                                                hasCentralHeating: e.target.checked
                                                                                                                                                                                                                                      }))
                                                                                                                                                                                                                                      building.hasCentralHeating = !building.hasCentralHeating
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                  />
                                                                                                                                                                                                        }
                                                                                                                                                                                                        label="Has Central Heating"
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={6}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <FormControlLabel
                                                                                                                                                                                                        control={
                                                                                                                                                                                                                  <Checkbox
                                                                                                                                                                                                                            checked={building.hasElectricHeating}
                                                                                                                                                                                                                            name='hasElectricHeating'
                                                                                                                                                                                                                            onChange={(e: any) => {
                                                                                                                                                                                                                                      setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                                                ...previousObject,
                                                                                                                                                                                                                                                hasElectricHeating: e.target.checked
                                                                                                                                                                                                                                      }))
                                                                                                                                                                                                                                      building.hasElectricHeating = !building.hasElectricHeating
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                  />
                                                                                                                                                                                                        }
                                                                                                                                                                                                        label="Has Electrical Heating"
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={6}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <FormControlLabel
                                                                                                                                                                                                        control={
                                                                                                                                                                                                                  <Checkbox
                                                                                                                                                                                                                            checked={building.hasGasHeating}
                                                                                                                                                                                                                            name='hasGasHeating'
                                                                                                                                                                                                                            onChange={(e: any) => {
                                                                                                                                                                                                                                      setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                                                ...previousObject,
                                                                                                                                                                                                                                                hasGasHeating: e.target.checked
                                                                                                                                                                                                                                      }))
                                                                                                                                                                                                                                      building.hasGasHeating = !building.hasGasHeating
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                  />
                                                                                                                                                                                                        }
                                                                                                                                                                                                        label="Has Gas Heating"
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={6}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <FormControlLabel
                                                                                                                                                                                                        control={
                                                                                                                                                                                                                  <Checkbox
                                                                                                                                                                                                                            checked={building.hasOwnBicycleRoom}
                                                                                                                                                                                                                            name='hasOwnBicycleRoom'
                                                                                                                                                                                                                            onChange={(e: any) => {
                                                                                                                                                                                                                                      setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                                                ...previousObject,
                                                                                                                                                                                                                                                hasOwnBicycleRoom: e.target.checked
                                                                                                                                                                                                                                      }))
                                                                                                                                                                                                                                      building.hasOwnBicycleRoom = !building.hasOwnBicycleRoom
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                  />
                                                                                                                                                                                                        }
                                                                                                                                                                                                        label="Has own bicycle room"
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={6}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <FormControlLabel
                                                                                                                                                                                                        control={
                                                                                                                                                                                                                  <Checkbox
                                                                                                                                                                                                                            checked={building.hasOwnElevator}
                                                                                                                                                                                                                            name='hasOwnElevator'
                                                                                                                                                                                                                            onChange={(e: any) => {
                                                                                                                                                                                                                                      setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                                                ...previousObject,
                                                                                                                                                                                                                                                hasOwnElevator: e.target.checked
                                                                                                                                                                                                                                      }))
                                                                                                                                                                                                                                      building.hasOwnElevator = !building.hasOwnElevator
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                  />
                                                                                                                                                                                                        }
                                                                                                                                                                                                        label="Has own elevator"
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={6}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <FormControlLabel
                                                                                                                                                                                                        control={
                                                                                                                                                                                                                  <Checkbox
                                                                                                                                                                                                                            checked={building.hasOwnParkingLot}
                                                                                                                                                                                                                            name='hasOwnParkingLot'
                                                                                                                                                                                                                            onChange={(e: any) => {
                                                                                                                                                                                                                                      setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                                                ...previousObject,
                                                                                                                                                                                                                                                hasOwnParkingLot: e.target.checked
                                                                                                                                                                                                                                      }))
                                                                                                                                                                                                                                      building.hasOwnParkingLot = !building.hasOwnParkingLot
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                  />
                                                                                                                                                                                                        }
                                                                                                                                                                                                        label="Has own parking lot"
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={6}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <FormControlLabel
                                                                                                                                                                                                        control={
                                                                                                                                                                                                                  <Checkbox
                                                                                                                                                                                                                            checked={building.hasOwnWaterPump}
                                                                                                                                                                                                                            name='hasOwnWaterPump'
                                                                                                                                                                                                                            onChange={(e: any) => {
                                                                                                                                                                                                                                      setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                                                ...previousObject,
                                                                                                                                                                                                                                                hasOwnWaterPump: e.target.checked
                                                                                                                                                                                                                                      }))
                                                                                                                                                                                                                                      building.hasOwnWaterPump = !building.hasOwnWaterPump
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                  />
                                                                                                                                                                                                        }
                                                                                                                                                                                                        label="Has own water pump"
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={6}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <FormControlLabel
                                                                                                                                                                                                        control={
                                                                                                                                                                                                                  <Checkbox
                                                                                                                                                                                                                            checked={building.hasSolarPower}
                                                                                                                                                                                                                            name='hasSolarPower'
                                                                                                                                                                                                                            onChange={(e: any) => {
                                                                                                                                                                                                                                      setCurrentBuildingObject((previousObject: any) => ({
                                                                                                                                                                                                                                                ...previousObject,
                                                                                                                                                                                                                                                hasSolarPower: e.target.checked
                                                                                                                                                                                                                                      }))
                                                                                                                                                                                                                                      building.hasSolarPower = !building.hasSolarPower
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                  />
                                                                                                                                                                                                        }
                                                                                                                                                                                                        label="Has own solar power"
                                                                                                                                                                                              />
                                                                                                                                                                                    </Grid>
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              item
                                                                                                                                                                                              md={12}
                                                                                                                                                                                              xs={12}
                                                                                                                                                                                    >
                                                                                                                                                                                              <Box
                                                                                                                                                                                                        sx={{
                                                                                                                                                                                                                  alignItems: 'center',
                                                                                                                                                                                                                  display: 'flex',
                                                                                                                                                                                                                  flexDirection: 'column',
                                                                                                                                                                                                        }}
                                                                                                                                                                                              >
                                                                                                                                                                                                        {building.image ? (
                                                                                                                                                                                                                  <Box
                                                                                                                                                                                                                            sx={{
                                                                                                                                                                                                                                      alignItems: 'center',
                                                                                                                                                                                                                                      backgroundColor: 'neutral.50',
                                                                                                                                                                                                                                      backgroundImage: `url(${building.image})`,
                                                                                                                                                                                                                                      backgroundPosition: 'center',
                                                                                                                                                                                                                                      backgroundSize: 'cover',
                                                                                                                                                                                                                                      borderRadius: 1,
                                                                                                                                                                                                                                      display: 'flex',
                                                                                                                                                                                                                                      height: 300,
                                                                                                                                                                                                                                      justifyContent: 'center',
                                                                                                                                                                                                                                      overflow: 'hidden',
                                                                                                                                                                                                                                      width: 300,
                                                                                                                                                                                                                            }}
                                                                                                                                                                                                                  />
                                                                                                                                                                                                        ) : (
                                                                                                                                                                                                                  <Box
                                                                                                                                                                                                                            sx={{
                                                                                                                                                                                                                                      alignItems: 'center',
                                                                                                                                                                                                                                      backgroundColor: 'neutral.50',
                                                                                                                                                                                                                                      borderRadius: 1,
                                                                                                                                                                                                                                      display: 'flex',

                                                                                                                                                                                                                                      height: 300,
                                                                                                                                                                                                                                      justifyContent: 'center',
                                                                                                                                                                                                                                      width: 400,
                                                                                                                                                                                                                            }}
                                                                                                                                                                                                                  >
                                                                                                                                                                                                                            <SvgIcon>
                                                                                                                                                                                                                                      <Image01Icon />
                                                                                                                                                                                                                            </SvgIcon>
                                                                                                                                                                                                                  </Box>
                                                                                                                                                                                                        )}
                                                                                                                                                                                                        <Box
                                                                                                                                                                                                                  sx={{
                                                                                                                                                                                                                            cursor: 'pointer',
                                                                                                                                                                                                                            ml: 2,
                                                                                                                                                                                                                  }}
                                                                                                                                                                                                        >
                                                                                                                                                                                                                  <Typography variant="subtitle2">{building.street + " " + building.streetNumber}</Typography>
                                                                                                                                                                                                                  <Typography
                                                                                                                                                                                                                            color="text.secondary"
                                                                                                                                                                                                                            variant="body2"
                                                                                                                                                                                                                  >
                                                                                                                                                                                                                            in {building.city}
                                                                                                                                                                                                                  </Typography>
                                                                                                                                                                                                        </Box>
                                                                                                                                                                                              </Box>
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
                                                                                                                                                                          onClick={handleBuildingUpdateClick}
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

                                                                                                                                                      <Button
                                                                                                                                                                onClick={handleBuildingDeleteClick}
                                                                                                                                                                color="error"
                                                                                                                                                      >
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
                                        onPageChange={onPageChange}
                                        onRowsPerPageChange={onRowsPerPageChange}
                                        page={page}
                                        rowsPerPage={rowsPerPage}
                                        rowsPerPageOptions={[5, 10, 25]}
                              />
                    </Box >
          );
};

BuildingListTable.propTypes = {
          count: PropTypes.number,
          items: PropTypes.array,
          onPageChange: PropTypes.func,
          onRowsPerPageChange: PropTypes.func,
          page: PropTypes.number,
          rowsPerPage: PropTypes.number,
          onDeselectOne: PropTypes.func,
          onSelectOne: PropTypes.func,
          selected: PropTypes.array
};
