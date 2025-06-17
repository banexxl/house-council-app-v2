import type { ChangeEvent, FC, MouseEvent } from 'react';
import { Fragment, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import type { SeverityPillColor } from 'src/components/severity-pill';
import ChevronDownIcon from '@untitled-ui/icons-react/build/esm/ChevronDown';
import ChevronRightIcon from '@untitled-ui/icons-react/build/esm/ChevronRight';
import DotsHorizontalIcon from '@untitled-ui/icons-react/build/esm/DotsHorizontal';
import Image01Icon from '@untitled-ui/icons-react/build/esm/Image01';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
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
import { Card, SvgIcon } from '@mui/material';
import { BaseEntity } from 'src/types/base-entity';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { paths } from 'src/paths';

interface BuildingListTableProps {
  count?: number;
  items?: Building[];
  onPageChange?: (event: MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
  onRowsPerPageChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  page?: number;
  rowsPerPage?: number;
  buildingStatuses: (BaseEntity & { resource_string: string })[]
}

export const BuildingListTable: FC<BuildingListTableProps> = ({
  count = 0,
  items = [],
  onPageChange = () => { },
  onRowsPerPageChange,
  page = 0,
  rowsPerPage = 0,
  buildingStatuses
}) => {

  const { t } = useTranslation();
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

  const colorSwitcher = (value: boolean): SeverityPillColor => {
    return value ? 'success' : 'error';
  }

  return (
    <div>
      <Scrollbar>
        <Table sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>{t('common.lblName')}</TableCell>
              <TableCell>{t('common.lblCity')}</TableCell>
              <TableCell>{t('common.lblAddress')}</TableCell>
              <TableCell>{t('common.lblStatus')}</TableCell>
              <TableCell>{t('common.lblHasBicycleRoom')}</TableCell>
              <TableCell>{t('common.lblHasParkingLot')}</TableCell>
              <TableCell>{t('common.lblHasElevator')}</TableCell>
              <TableCell>{t('common.lblHasGasHeating')}</TableCell>
              <TableCell>{t('common.lblHasCentralHeating')}</TableCell>
              <TableCell>{t('common.lblRecentlyBuilt')}</TableCell>
              <TableCell>{t('common.lblHasElectricHeating')}</TableCell>
              <TableCell>{t('common.lblHasSolarPower')}</TableCell>
              <TableCell>{t('common.lblHasPreHeatedWater')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((building: Building) => {
              const isCurrent = building.id === currentBuilding;
              const bicycleRoomColor = colorSwitcher(building.has_bicycle_room);
              const parkingColor = colorSwitcher(building.has_parking_lot);
              const elevatorColor = colorSwitcher(building.has_elevator);
              const gasHeatingColor = colorSwitcher(building.has_gas_heating);
              const centralHeatingColor = colorSwitcher(building.has_central_heating);
              const recentlyBuiltColor = colorSwitcher(building.is_recently_built);
              const electricHeatingColor = colorSwitcher(building.has_electric_heating);
              const solarPowerColor = colorSwitcher(building.has_solar_power);
              const preHeatedWaterColor = colorSwitcher(building.has_pre_heated_water);

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
                        {building.building_images!.length > 0 ? (
                          <Box
                            sx={{
                              width: 64,
                              height: 64,
                              borderRadius: 1,
                              backgroundImage: `url(${building.building_images![0]})`,
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
                          <Link
                            color="inherit"
                            href={paths.dashboard.buildings.index + '/' + encodeURIComponent(building.id!)}
                            style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                          >
                            <Typography variant="subtitle2">
                              {building.building_location?.street_address}
                            </Typography>
                          </Link>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{building.building_location?.city}</TableCell>
                    <TableCell>{building.building_location?.street_address} {building.building_location?.street_number}</TableCell>
                    <TableCell>
                      <SeverityPill
                        color={
                          (
                            buildingStatuses.find((status: BaseEntity) => status.id === building.building_status)?.resource_string === 'buildings.lblBuildingStatusActive'
                              ? 'success'
                              : buildingStatuses.find((status: BaseEntity) => status.id === building.building_status)?.resource_string === 'buildings.lblBuildingStatusInactive'
                                ? 'error'
                                : 'warning'
                          ) as SeverityPillColor
                        }
                      >
                        {(() => {
                          const status = buildingStatuses.find((status: BaseEntity) => status.id === building.building_status);
                          return status?.resource_string
                            ? t(status.resource_string)
                            : building.building_status;
                        })()}
                      </SeverityPill>
                    </TableCell>

                    <TableCell align="left">
                      <SeverityPill color={bicycleRoomColor}>
                        {building.has_bicycle_room ? (
                          <SvgIcon>
                            <CheckCircleIcon />
                          </SvgIcon>
                        ) : (
                          <SvgIcon>
                            <CancelIcon />
                          </SvgIcon>
                        )}
                      </SeverityPill>
                    </TableCell>
                    <TableCell align="left">
                      <SeverityPill color={parkingColor}>
                        {
                          building.has_parking_lot ? (
                            <SvgIcon>
                              <CheckCircleIcon />
                            </SvgIcon>
                          ) : (
                            <SvgIcon>
                              <CancelIcon />
                            </SvgIcon>
                          )
                        }
                      </SeverityPill>
                    </TableCell>
                    <TableCell align="left">
                      <SeverityPill color={elevatorColor}>
                        {
                          building.has_elevator ? (
                            <SvgIcon>
                              <CheckCircleIcon />
                            </SvgIcon>
                          ) : (
                            <SvgIcon>
                              <CancelIcon />
                            </SvgIcon>
                          )
                        }
                      </SeverityPill>
                    </TableCell>
                    <TableCell align="left">
                      <SeverityPill color={gasHeatingColor}>
                        {
                          building.has_gas_heating ? (
                            <SvgIcon>
                              <CheckCircleIcon />
                            </SvgIcon>
                          ) : (
                            <SvgIcon>
                              <CancelIcon />
                            </SvgIcon>
                          )
                        }
                      </SeverityPill>
                    </TableCell>
                    <TableCell align="left">
                      <SeverityPill color={centralHeatingColor}>
                        {
                          building.has_central_heating ? (
                            <SvgIcon>
                              <CheckCircleIcon />
                            </SvgIcon>
                          ) : (
                            <SvgIcon>
                              <CancelIcon />
                            </SvgIcon>
                          )
                        }
                      </SeverityPill>
                    </TableCell>
                    <TableCell align="left">
                      <SeverityPill color={recentlyBuiltColor}>
                        {
                          building.is_recently_built ? (
                            <SvgIcon>
                              <CheckCircleIcon />
                            </SvgIcon>
                          ) : (
                            <SvgIcon>
                              <CancelIcon />
                            </SvgIcon>
                          )
                        }
                      </SeverityPill>
                    </TableCell>
                    <TableCell align="left">
                      <SeverityPill color={electricHeatingColor}>
                        {
                          building.has_electric_heating ? (
                            <SvgIcon>
                              <CheckCircleIcon />
                            </SvgIcon>
                          ) : (
                            <SvgIcon>
                              <CancelIcon />
                            </SvgIcon>
                          )
                        }
                      </SeverityPill>
                    </TableCell>
                    <TableCell align="left">
                      <SeverityPill color={solarPowerColor}>
                        {
                          building.has_solar_power ? (
                            <SvgIcon>
                              <CheckCircleIcon />
                            </SvgIcon>
                          ) : (
                            <SvgIcon>
                              <CancelIcon />
                            </SvgIcon>
                          )
                        }
                      </SeverityPill>
                    </TableCell>
                    <TableCell align="left">
                      <SeverityPill color={preHeatedWaterColor}>
                        {
                          building.has_pre_heated_water ? (
                            <SvgIcon>
                              <CheckCircleIcon />
                            </SvgIcon>
                          ) : (
                            <SvgIcon>
                              <CancelIcon />
                            </SvgIcon>
                          )
                        }
                      </SeverityPill>
                    </TableCell>

                  </TableRow>

                  {isCurrent && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Card>

                          <CardContent>
                            <Grid container spacing={3}>
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

                        </Card>
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
