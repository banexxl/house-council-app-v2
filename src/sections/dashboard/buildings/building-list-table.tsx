import type { ChangeEvent, FC, MouseEvent } from 'react';
import { Fragment } from 'react';
import PropTypes from 'prop-types';
import type { SeverityPillColor } from 'src/components/severity-pill';
import Image01Icon from '@untitled-ui/icons-react/build/esm/Image01';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Link from 'next/link';
import { Scrollbar } from 'src/components/scrollbar';
import { SeverityPill } from 'src/components/severity-pill';
import { buildingStatusMap, type Building } from 'src/types/building';
import { SvgIcon, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { paths } from 'src/paths';

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

  const { t } = useTranslation();

  const colorSwitcher = (value: boolean): SeverityPillColor => {
    return value ? 'success' : 'error';
  }

  return (
    <div>
      <Scrollbar>
        <Table sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow>
              <TableCell>{t('common.lblCoverImage')}</TableCell>
              <TableCell>{t('common.lblCity')}</TableCell>
              <TableCell>{t('common.lblAddress')}</TableCell>
              <TableCell>{t('common.lblStatus')}</TableCell>
              <TableCell>{t('common.lblApartmentCount')}</TableCell>
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
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography variant="subtitle1" color="textSecondary">
                    {t('common.emptyTableInfo')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((building: Building) => {
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
                        <Link
                          color="inherit"
                          href={paths.dashboard.buildings.index + '/' + encodeURIComponent(building.id!)}
                          style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {building.building_images && building.building_images!.length > 0 ? (
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
                          </Box>
                        </Link>
                      </TableCell>
                      <TableCell>{building.building_location?.city}</TableCell>
                      <TableCell>{building.building_location?.street_address} {building.building_location?.street_number}</TableCell>
                      <TableCell>
                        <SeverityPill
                          color={
                            building.building_status === 'active'
                              ? 'success'
                              : building.building_status === 'inactive'
                                ? 'error'
                                : 'warning'
                          }
                        >
                          {t(buildingStatusMap[building.building_status] || building.building_status)}
                        </SeverityPill>
                      </TableCell>
                      <TableCell align="left">{building.number_of_apartments}</TableCell>
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
                  </Fragment>
                );
              })
            )}
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
