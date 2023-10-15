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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import { Scrollbar } from 'src/components/scrollbar';
import { SeverityPill } from 'src/components/severity-pill';
import type { Building } from '@/types/building';
import { FormControlLabel } from '@mui/material';
import { QuillEditor } from '@/components/quill-editor';

interface BuildingListTableProps {
          count?: number;
          items?: Building[];
          onPageChange?: (event: MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
          onRowsPerPageChange?: (event: ChangeEvent<HTMLInputElement>) => void;
          page?: number;
          rowsPerPage?: number;
}

export const BuildingListTable: FC<BuildingListTableProps> = (props) => {

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
                                                                      <TableCell>Board</TableCell>
                                                            </TableRow>
                                                  </TableHead>
                                                  <TableBody>
                                                            {items.map((building) => {
                                                                      const isCurrent = building._id === currentBuilding;
                                                                      const issueCountColor = building.unresolvedIssues.length >= 10 ? 'success' : 'error';
                                                                      const hasElevatorColor = building.hasOwnElevator === true ? 'success' : 'warning';
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
                                                                                                    <TableCell>{building.appartmentCount}</TableCell>
                                                                                                    <TableCell>
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
                                                                                                                        out of {building.unresolvedIssues.length}
                                                                                                              </Typography>
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
                                                                                                    <TableCell>{building.board}</TableCell>
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
                                                                                                                                                                          />
                                                                                                                                                                </Grid>
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <TextField
                                                                                                                                                                                    defaultValue={building.storiesHigh}
                                                                                                                                                                                    fullWidth
                                                                                                                                                                                    label="Building stories high"
                                                                                                                                                                                    name="storiesHigh"
                                                                                                                                                                          />
                                                                                                                                                                </Grid>
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <TextField
                                                                                                                                                                                    defaultValue={building.appartmentCount}
                                                                                                                                                                                    fullWidth
                                                                                                                                                                                    label="Building appartment count"
                                                                                                                                                                                    name="appartmentCount"
                                                                                                                                                                          />
                                                                                                                                                                </Grid>
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <FormControlLabel
                                                                                                                                                                                    control={<Switch defaultChecked />}
                                                                                                                                                                                    label="Is recently built"
                                                                                                                                                                                    value={building.isRecentlyBuilt}
                                                                                                                                                                                    name='isRecentlyBuilt'
                                                                                                                                                                          />
                                                                                                                                                                </Grid>
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <FormControlLabel
                                                                                                                                                                                    control={<Switch defaultChecked />}
                                                                                                                                                                                    label="Active"
                                                                                                                                                                                    value={building.buildingStatus}
                                                                                                                                                                                    name='isActive'
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
                                                                                                                                                                                    // onChange={(value: string): void => {
                                                                                                                                                                                    //           formik.setFieldValue('description', value);
                                                                                                                                                                                    // }}
                                                                                                                                                                                    placeholder="Write something"
                                                                                                                                                                                    sx={{ height: 400 }}
                                                                                                                                                                                    defaultValue={building.description}
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
                                                                                                                                                                                    control={<Switch defaultChecked />}
                                                                                                                                                                                    label="Has central heating"
                                                                                                                                                                                    value={building.hasCentralHeating}
                                                                                                                                                                                    name='hasCentralHeating'
                                                                                                                                                                          />
                                                                                                                                                                </Grid>
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <FormControlLabel
                                                                                                                                                                                    control={<Switch defaultChecked />}
                                                                                                                                                                                    label="Has electrical heating"
                                                                                                                                                                                    value={building.hasElectricHeating}
                                                                                                                                                                                    name='hasElectricHeating'
                                                                                                                                                                          />
                                                                                                                                                                </Grid>
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <FormControlLabel
                                                                                                                                                                                    control={<Switch defaultChecked />}
                                                                                                                                                                                    label="Has gas heating"
                                                                                                                                                                                    value={building.hasGasHeating}
                                                                                                                                                                                    name='hasGasHeating'
                                                                                                                                                                          />
                                                                                                                                                                </Grid>
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <FormControlLabel
                                                                                                                                                                                    control={<Switch defaultChecked />}
                                                                                                                                                                                    label="Has own bicycle room"
                                                                                                                                                                                    value={building.hasOwnBicycleRoom}
                                                                                                                                                                                    name='hasOwnBicycleRoom'
                                                                                                                                                                          />
                                                                                                                                                                </Grid>
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <FormControlLabel
                                                                                                                                                                                    control={<Switch defaultChecked />}
                                                                                                                                                                                    label="Has own elevator"
                                                                                                                                                                                    value={building.hasOwnElevator}
                                                                                                                                                                                    name='hasOwnElevator'
                                                                                                                                                                          />
                                                                                                                                                                </Grid>
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <FormControlLabel
                                                                                                                                                                                    control={<Switch defaultChecked />}
                                                                                                                                                                                    label="Has own parking lot"
                                                                                                                                                                                    value={building.hasOwnParkingLot}
                                                                                                                                                                                    name='hasOwnParkingLot'
                                                                                                                                                                          />
                                                                                                                                                                </Grid>
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <FormControlLabel
                                                                                                                                                                                    control={<Switch defaultChecked />}
                                                                                                                                                                                    label="Has own water pump"
                                                                                                                                                                                    value={building.hasOwnWaterPump}
                                                                                                                                                                                    name='hasOwnWaterPump'
                                                                                                                                                                          />
                                                                                                                                                                </Grid>
                                                                                                                                                                <Grid
                                                                                                                                                                          item
                                                                                                                                                                          md={6}
                                                                                                                                                                          xs={12}
                                                                                                                                                                >
                                                                                                                                                                          <FormControlLabel
                                                                                                                                                                                    control={<Switch defaultChecked />}
                                                                                                                                                                                    label="Has solar power"
                                                                                                                                                                                    value={building.hasSolarPower}
                                                                                                                                                                                    name='hasSolarPower'
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
