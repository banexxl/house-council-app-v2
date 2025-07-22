'use client';

import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Typography
} from '@mui/material';
import { MouseEvent, ChangeEvent, FC } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Scrollbar } from 'src/components/scrollbar';
import { PopupModal } from 'src/components/modal-dialog';
import { BuildingLocation } from 'src/types/location';
import { validate as isUUID } from 'uuid';
import DeleteIcon from '@mui/icons-material/Delete';
import { useDialog } from 'src/hooks/use-dialog';

interface LocationsTableProps {
  items?: BuildingLocation[];
  count?: number;
  onPageChange?: (event: MouseEvent<HTMLButtonElement> | null, page: number) => void;
  onRowsPerPageChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  page?: number;
  rowsPerPage?: number;
  handleDeleteConfirm?: (data: { locationId: string }) => void;
}

interface DeleteLocationsData {
  locationId: string;
}

export const LocationsTable: FC<LocationsTableProps> = ({
  items = [],
  count,
  onPageChange = () => { },
  onRowsPerPageChange,
  page,
  rowsPerPage = 10,
  handleDeleteConfirm = () => { }
}) => {

  const { t } = useTranslation();

  const deleteDialog = useDialog<DeleteLocationsData>();
  const handleDelete = (data: DeleteLocationsData) => {
    handleDeleteConfirm(data);
    deleteDialog.handleClose();
  };
  return (
    <Box sx={{ position: 'relative' }}>
      <Scrollbar>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('locations.locationStreet')}</TableCell>
              <TableCell>{t('locations.locationStreetNumber')}</TableCell>
              <TableCell>{t('locations.locationCity')}</TableCell>
              <TableCell>{t('locations.locationState')}</TableCell>
              <TableCell>{t('locations.locationCountry')}</TableCell>
              <TableCell>{t('locations.locationZipCode')}</TableCell>
              <TableCell>{t('locations.locationTaken')}</TableCell>
              <TableCell>{t('common.lblActions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length > 0 ? items.map((loc) => {

              return (
                <TableRow hover key={loc.id} sx={{ cursor: 'pointer' }}>
                  <TableCell>{loc.street_address}</TableCell>
                  <TableCell>{loc.street_number}</TableCell>
                  <TableCell>{loc.city}</TableCell>
                  <TableCell>{loc.region}</TableCell>
                  <TableCell>{loc.country}</TableCell>
                  <TableCell>{loc.post_code}</TableCell>
                  <TableCell>{isUUID(loc.building_id) ? t('common.lblYes') : t('common.lblNo')}</TableCell>
                  <TableCell>
                    <Button
                      startIcon={<DeleteIcon />}
                      onClick={() => deleteDialog.handleOpen({ locationId: loc.id! })}
                      variant="outlined"
                      color="error"
                    >
                      {t('common.btnDelete')}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2">{t('common.emptyTableInfo')}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Scrollbar>

      <TablePagination
        component="div"
        count={count ?? items.length}
        page={page ?? 0}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPage={rowsPerPage ?? 10}
        rowsPerPageOptions={[5, 10, 25]}
        showFirstButton
        showLastButton
        labelRowsPerPage={t('common.rowsPerPage')}
      />

      <PopupModal
        isOpen={deleteDialog.open}
        onClose={deleteDialog.handleClose}
        onConfirm={() => {
          if (deleteDialog.data) {
            handleDelete(deleteDialog.data);
          }
        }}
        title={t('warning.deleteWarningTitle')}
        confirmText={t('common.btnDelete')}
        cancelText={t('common.btnClose')}
        children={t('warning.deleteWarningMessage')}
        type="confirmation"
      />
    </Box>
  );
};

LocationsTable.propTypes = {
  items: PropTypes.array,
  count: PropTypes.number,
  onPageChange: PropTypes.func,
  onRowsPerPageChange: PropTypes.func,
  page: PropTypes.number,
  rowsPerPage: PropTypes.number,
};
