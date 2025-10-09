'use client';

import {
     Box,
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
import { MouseEvent, ChangeEvent, FC, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PopupModal } from 'src/components/modal-dialog';
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
     /** Minimum width per column (px) used to compute scrollable minWidth. Default 160. */
     minColumnWidth?: number;
     /** Dense mode reduces vertical padding and row height */
     dense?: boolean;
}

export const GenericTable = <T extends { id: string }>(
     {
          columns,
          items = [],
          count = items.length,
          page: pageProp,
          rowsPerPage: rowsPerPageProp,
          onPageChange,
          onRowsPerPageChange,
          baseUrl,
          rowActions = [],
          tableTitle,
          tableSubtitle,
          minColumnWidth = 160,
          dense = false
     }: GenericTableProps<T>
) => {
     const { t } = useTranslation();

     // Internal pagination state if not controlled
     const [internalPage, setInternalPage] = useState(0);
     const [internalRowsPerPage, setInternalRowsPerPage] = useState(5);

     const page = typeof pageProp === 'number' ? pageProp : internalPage;
     const rowsPerPage = typeof rowsPerPageProp === 'number' ? rowsPerPageProp : internalRowsPerPage;

     const handlePageChange = (event: MouseEvent<HTMLButtonElement> | null, newPage: number) => {
          if (onPageChange) onPageChange(event, newPage);
          if (typeof pageProp !== 'number') setInternalPage(newPage);
     };

     const handleRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
          if (onRowsPerPageChange) onRowsPerPageChange(event);
          if (typeof rowsPerPageProp !== 'number') {
               setInternalRowsPerPage(parseInt(event.target.value, 10));
               setInternalPage(0);
          }
     };

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

     // Compute a minWidth so that if many columns exist, horizontal scrolling engages.
     const computedMinWidth = useMemo(() => {
          // +1 for actions column
          const totalCols = columns.length + 1;
          return totalCols * minColumnWidth;
     }, [columns.length, minColumnWidth]);

     return (
          <Box sx={{ position: 'relative' }}>
               <Card sx={{ overflow: 'visible' }}>
                    <CardHeader
                         title={t(tableTitle || '')}
                         subheader={t(tableSubtitle || '')}
                    />
                    <Box
                         sx={{
                              position: 'relative',
                              overflowX: 'auto',
                              overflowY: 'hidden',
                              WebkitOverflowScrolling: 'touch',
                              scrollbarColor: (theme) => `${theme.palette.divider} transparent`,
                              scrollbarWidth: 'thin', // Firefox
                              // Chrome / Edge
                              '&::-webkit-scrollbar': {
                                   height: 8
                              },
                              '&::-webkit-scrollbar-track': {
                                   background: 'transparent'
                              },
                              '&::-webkit-scrollbar-thumb': {
                                   backgroundColor: (theme) => theme.palette.action.hover,
                                   borderRadius: 4,
                                   '&:hover': { backgroundColor: (theme) => theme.palette.action.selected }
                              },
                              // subtle gradient edges for scroll affordance only when overflow
                              '&:before, &:after': {
                                   content: '""',
                                   position: 'absolute',
                                   top: 0,
                                   bottom: 8, // leave room so gradient doesn't cover scrollbar
                                   width: 24,
                                   pointerEvents: 'none',
                                   opacity: 0,
                                   transition: 'opacity 0.2s'
                              },
                              '&:before': {
                                   left: 0,
                                   background: (theme) => `linear-gradient(to right, ${theme.palette.background.paper} 30%, rgba(0,0,0,0))`
                              },
                              '&:after': {
                                   right: 0,
                                   background: (theme) => `linear-gradient(to left, ${theme.palette.background.paper} 30%, rgba(0,0,0,0))`
                              },
                              // show gradients only when actually scrollable
                              '&.is-scrollable:before, &.is-scrollable:after': { opacity: 1 }
                         }}
                         className="generic-table-scroll"
                    >
                         <Table
                              stickyHeader={false}
                              size={dense ? 'small' : 'medium'}
                              sx={{
                                   minWidth: computedMinWidth,
                                   mb: 0,
                                   '& thead th': { whiteSpace: 'nowrap' },
                                   '& tbody td': { py: dense ? 0.75 : 1.25 }
                              }}
                         >
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
                                        items
                                             .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                             .map((item) => (
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
                                                            ) : 'N/A'}
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
                    </Box>
                    <TablePagination
                         component="div"
                         count={count}
                         page={page}
                         onPageChange={handlePageChange}
                         onRowsPerPageChange={handleRowsPerPageChange}
                         rowsPerPage={rowsPerPage}
                         rowsPerPageOptions={[5, 10, 25]}
                         showFirstButton
                         showLastButton
                         labelRowsPerPage={t('common.rowsPerPage')}
                         sx={{ pt: 0.5, mt: 0 }}
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
