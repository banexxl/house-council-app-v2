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
     Typography,
} from '@mui/material';
import { MouseEvent, ChangeEvent, FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Scrollbar } from 'src/components/scrollbar';
import { PopupModal } from 'src/components/modal-dialog';
import DeleteIcon from '@mui/icons-material/Delete';
import { useDialog } from 'src/hooks/use-dialog';
import Link from 'next/link';
import { CheckCircle as CheckCircleIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { SvgIcon } from '@mui/material';

export interface TableColumn<T> {
     key: keyof T;
     label: string;
     render?: (value: T[keyof T], item: T) => React.ReactNode;
}

interface GenericTableProps<T> {
     columns: TableColumn<T>[];
     items: T[];
     count?: number;
     page?: number;
     rowsPerPage?: number;
     onPageChange?: (event: MouseEvent<HTMLButtonElement> | null, page: number) => void;
     onRowsPerPageChange?: (event: ChangeEvent<HTMLInputElement>) => void;
     handleDeleteConfirm?: (data: { id: string }) => void;
     baseUrl?: string;
}

export const GenericTable = <T extends { id: string }>(
     {
          columns,
          items = [],
          count = items.length,
          page = 0,
          rowsPerPage = 10,
          onPageChange = () => { },
          onRowsPerPageChange = () => { },
          handleDeleteConfirm = () => { },
          baseUrl,
     }: GenericTableProps<T>
) => {
     const { t } = useTranslation();
     const deleteDialog = useDialog<{ id: string }>();

     const handleDelete = (data: { id: string }) => {
          handleDeleteConfirm(data);
          deleteDialog.handleClose();
     };

     return (
          <Box sx={{ position: 'relative' }}>
               <Scrollbar>
                    <Table>
                         <TableHead>
                              <TableRow>
                                   {columns.map((col) => (
                                        <TableCell key={String(col.key)}>{col.label}</TableCell>
                                   ))}
                                   <TableCell>{t('common.lblActions')}</TableCell>
                              </TableRow>
                         </TableHead>
                         <TableBody>
                              {items.length > 0 ? (
                                   items.map((item) => (
                                        <TableRow
                                             hover
                                             key={item.id}
                                             sx={{ cursor: baseUrl ? 'pointer' : 'default' }}
                                        >
                                             {columns.map((col) => (
                                                  <TableCell key={String(col.key)}>
                                                       {typeof item[col.key] === 'boolean' ? (
                                                            <SvgIcon>
                                                                 {item[col.key] ? (
                                                                      <CheckCircleIcon color="success" />
                                                                 ) : (
                                                                      <CancelIcon color="error" />
                                                                 )}
                                                            </SvgIcon>
                                                       ) : typeof item[col.key] === 'string' && /^https?:\/\//.test(item[col.key] as string) ? (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                 <img src={item[col.key] as string} alt="cell-img" style={{ maxWidth: 64, maxHeight: 64, borderRadius: 4 }} />
                                                            </Box>
                                                       ) : (
                                                            <Box
                                                                 component={Link}
                                                                 href={baseUrl ? `${baseUrl}/${item.id}` : '#'}
                                                                 sx={{
                                                                      display: 'block',
                                                                      color: 'inherit',
                                                                      textDecoration: 'none',
                                                                      pointerEvents: baseUrl ? 'auto' : 'none',
                                                                 }}
                                                            >
                                                                 {col.render
                                                                      ? col.render(item[col.key], item)
                                                                      : String(item[col.key])}
                                                            </Box>
                                                       )}
                                                  </TableCell>
                                             ))}
                                             <TableCell>
                                                  <Button
                                                       startIcon={<DeleteIcon />}
                                                       onClick={() => deleteDialog.handleOpen({ id: item.id })}
                                                       variant="outlined"
                                                       color="error"
                                                  >
                                                       {t('common.btnDelete')}
                                                  </Button>
                                             </TableCell>
                                        </TableRow>
                                   ))
                              ) : (
                                   <TableRow>
                                        <TableCell colSpan={columns.length + 1} align="center">
                                             <Typography variant="body2">
                                                  {t('common.emptyTableInfo')}
                                             </Typography>
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
                    onPageChange={onPageChange}
                    onRowsPerPageChange={onRowsPerPageChange}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[5, 10, 25]}
                    showFirstButton
                    showLastButton
                    labelRowsPerPage={t('common.rowsPerPage')}
               />

               <PopupModal
                    isOpen={deleteDialog.open}
                    onClose={deleteDialog.handleClose}
                    onConfirm={() => deleteDialog.data && handleDelete(deleteDialog.data)}
                    title={t('warning.deleteWarningTitle')}
                    confirmText={t('common.btnDelete')}
                    cancelText={t('common.btnClose')}
                    type="confirmation"
               >
                    {t('warning.deleteWarningMessage')}
               </PopupModal>
          </Box>
     );
};
