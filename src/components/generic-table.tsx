'use client';

import {
     Box,
     Button,
     Card,
     CardHeader,
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
     baseUrl?: string;
     rowActions?: Array<(item: T, openActionDialog: (options: {
          id: string;
          title?: string;
          message?: string;
          confirmText?: string;
          cancelText?: string;
          onConfirm?: () => void;
     }) => void) => React.ReactNode>;
     tableTitle?: string;
     tableSubtitle?: string;
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
          baseUrl,
          rowActions = [],
          tableTitle,
          tableSubtitle
     }: GenericTableProps<T>
) => {
     const { t } = useTranslation();
     // Generic dialog state: open, content, confirm callback
     const actionDialog = useDialog<{
          id: string;
          title?: string;
          message?: string;
          confirmText?: string;
          cancelText?: string;
          onConfirm?: () => void;
     }>();

     const openActionDialog = (options: {
          id: string;
          title?: string;
          message?: string;
          confirmText?: string;
          cancelText?: string;
          onConfirm?: () => void;
     }) => {
          actionDialog.handleOpen(options);
     };

     return (
          <Box sx={{ position: 'relative' }}>
               <Card>
                    <CardHeader
                         title={t(tableTitle || '')}
                         subheader={t(tableSubtitle || '')}
                    />

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
                                                       {rowActions.length > 0 ? (
                                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                                 {rowActions.map((action, idx) => (
                                                                      <span key={idx}>{action(item, openActionDialog)}</span>
                                                                 ))}
                                                            </Box>
                                                       ) : null}
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
                         isOpen={actionDialog.open}
                         onClose={actionDialog.handleClose}
                         onConfirm={() => {
                              if (actionDialog.data?.onConfirm) actionDialog.data.onConfirm();
                              actionDialog.handleClose();
                         }}
                         title={actionDialog.data?.title || t('warning.actionWarningTitle', 'Are you sure?')}
                         confirmText={actionDialog.data?.confirmText || t('common.btnConfirm', 'Confirm')}
                         cancelText={actionDialog.data?.cancelText || t('common.btnClose', 'Close')}
                         type="confirmation"
                    >
                         {actionDialog.data?.message || t('warning.actionWarningMessage', 'Are you sure you want to perform this action?')}
                    </PopupModal>
               </Card>
          </Box>
     );
};
