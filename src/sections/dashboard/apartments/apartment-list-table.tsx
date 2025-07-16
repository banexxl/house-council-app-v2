'use client';

import type { ChangeEvent, FC, MouseEvent } from 'react';
import { Fragment } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Link from 'next/link';
import { SvgIcon, Typography } from '@mui/material';
import Image01Icon from '@untitled-ui/icons-react/build/esm/Image01';
import { Scrollbar } from 'src/components/scrollbar';
import { SeverityPill } from 'src/components/severity-pill';
import type { SeverityPillColor } from 'src/components/severity-pill';
import { apartmentStatusMap, apartmentTypeMap, type Apartment } from 'src/types/apartment';
import { useTranslation } from 'react-i18next';
import { paths } from 'src/paths';

interface ApartmentListTableProps {
  count?: number;
  items?: Apartment[];
  onPageChange?: (event: MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
  onRowsPerPageChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  page?: number;
  rowsPerPage?: number;
}

export const ApartmentListTable: FC<ApartmentListTableProps> = ({
  count = 0,
  items = [],
  onPageChange = () => { },
  onRowsPerPageChange,
  page = 0,
  rowsPerPage = 0,
}) => {

  const { t } = useTranslation();

  const pillColor = (val?: string): SeverityPillColor | undefined => {
    switch (val) {
      case 'owned': return 'success';
      case 'rented': return 'warning';
      case 'for_rent': return 'info';
      case 'vacant': return 'info'; // or another valid SeverityPillColor
      default: return 'warning'; // or another valid SeverityPillColor
    }
  };

  return (
    <div>
      <Scrollbar>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell>{t('apartments.lblCoverImage')}</TableCell>
              <TableCell>{t('apartments.lblApartmentNumber')}</TableCell>
              <TableCell>{t('apartments.lblFloor')}</TableCell>
              <TableCell>{t('apartments.lblSizeM2')}</TableCell>
              <TableCell>{t('apartments.lblRooms')}</TableCell>
              <TableCell>{t('apartments.lblType')}</TableCell>
              <TableCell>{t('apartments.lblRentalStatus')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length > 0 ? (
              items.map((apartment: Apartment) => (
                <Fragment key={apartment.id}>
                  <TableRow hover>
                    <TableCell>
                      <Link
                        href={paths.dashboard.apartments.index + '/' + encodeURIComponent(apartment.id!)}
                        style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {apartment.cover_image ? (
                            <Box
                              sx={{
                                width: 64,
                                height: 64,
                                borderRadius: 1,
                                backgroundImage: `url(${apartment.cover_image})`,
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
                    <TableCell>{apartment.apartment_number}</TableCell>
                    <TableCell>{apartment.floor}</TableCell>
                    <TableCell>{apartment.square_meters ?? '-'}</TableCell>
                    <TableCell>{apartment.room_count ?? '-'}</TableCell>
                    <TableCell>{t(apartmentTypeMap[apartment.apartment_type])}</TableCell>
                    <TableCell>
                      <SeverityPill color={pillColor(apartment.apartment_status)}>
                        {t(apartmentStatusMap[apartment.apartment_status]) || apartment.apartment_status}
                      </SeverityPill>
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {t('apartments.lblApartmentListEmpty')}
                </TableCell>
              </TableRow>
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

ApartmentListTable.propTypes = {
  count: PropTypes.number,
  items: PropTypes.array,
  onPageChange: PropTypes.func,
  onRowsPerPageChange: PropTypes.func,
  page: PropTypes.number,
  rowsPerPage: PropTypes.number,
};
