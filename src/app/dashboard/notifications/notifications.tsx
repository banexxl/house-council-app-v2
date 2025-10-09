'use client';

import { useState, useMemo, useCallback } from 'react';
import { Box, Tabs, Tab, IconButton, Tooltip, Container, Stack, Typography, Card } from '@mui/material';
import { GenericTable, TableColumn } from 'src/components/generic-table';
import { Notification, NOTIFICATION_TYPES_MAP, NotificationType, NotificationTypeMap } from 'src/types/notification';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DeleteIcon from '@mui/icons-material/Delete';
import { deleteNotification, markNotificationRead } from 'src/app/actions/notification/notification-actions';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';

interface NotificationsClientProps {
     initialNotifications: Notification[];
}

export default function NotificationsClient({ initialNotifications }: NotificationsClientProps) {

     type Row = Notification & { id: string; created_at: string };
     const [type, setType] = useState<NotificationType>('all');

     // Normalize incoming notifications so that `type` is always a NotificationTypeMap object
     const normalize = useCallback((n: any): Row => {
          let typeObj: NotificationTypeMap;
          if (n && typeof n.type === 'object' && n.type?.value) {
               typeObj = n.type as NotificationTypeMap;
          } else {
               const raw = (n?.type ?? 'other') as NotificationType;
               typeObj = NOTIFICATION_TYPES_MAP.find(m => m.value === raw) || NOTIFICATION_TYPES_MAP.find(m => m.value === 'other')!;
          }
          return { ...(n as Notification), type: typeObj } as Row;
     }, []);

     const [items, setItems] = useState<Row[]>(() => (initialNotifications || []).map(normalize));
     const { t } = useTranslation();

     const filtered = useMemo<Row[]>(() => {
          if (type === 'all') return items;
          return items.filter(n => n.type.value === type);
     }, [items, type]);

     const columns: TableColumn<Row>[] = useMemo(() => {
          const base: TableColumn<Row>[] = [
               { key: 'title', label: t(tokens.notifications.col.title) },
               { key: 'description', label: t(tokens.notifications.col.message), render: v => (v as string).slice(0, 80) + ((v as string).length > 80 ? '…' : '') },
               { key: 'created_at', label: t(tokens.notifications.col.created), render: v => new Date(v as string).toLocaleString() },
               { key: 'is_read', label: t(tokens.notifications.col.read) }
          ];
          if (type === 'reminder') {
               base.splice(1, 0, { key: 'scheduled_for' as any, label: t(tokens.notifications.col.scheduledFor) });
          }
          if (type === 'message') {
               // Cast to include potential sender/receiver fields
               base.splice(1, 0, { key: 'sender_id' as any, label: t(tokens.notifications.col.sender) });
               base.splice(2, 0, { key: 'receiver_id' as any, label: t(tokens.notifications.col.receiver) });
          }
          if (type === 'alert') {
               base.splice(1, 0, { key: 'severity' as any, label: t(tokens.notifications.col.severity) });
          }

          if (type === 'announcement') {
               base.splice(1, 0, { key: 'announcement_id' as any, label: t(tokens.notifications.col.created) });
          }
          if (type === 'other') {
               base.splice(1, 0, { key: 'other_id' as any, label: t(tokens.notifications.col.created) });
          }
          if (type !== 'all') {
               base.unshift({ key: 'type', label: t(tokens.notifications.col.type), render: (_, row) => t(row.type.labelToken) });
          }
          return base;
     }, [type, t]);

     return (
          <Container maxWidth="xl">
               <Typography variant="h4" sx={{ mb: 3 }}>{t(tokens.notifications.centerTitle)}</Typography>
               <Card>
                    <Stack spacing={4}>
                         <Box
                              sx={{
                                   display: 'flex',
                                   flexDirection: { xs: 'column', md: 'row' },
                                   gap: 3,
                              }}
                         >
                              {/* Tabs Wrapper */}
                              <Box
                                   sx={{
                                        pt: { xs: 1, md: 1 },
                                        width: { xs: '100%', md: 200 },
                                        flexShrink: 0,
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: { xs: 'flex-start', md: 'center' },
                                        overflowX: { xs: 'auto', md: 'visible' },
                                        // Sticky behavior on mobile
                                        position: { xs: 'sticky', md: 'static' },
                                        top: { xs: (theme) => `calc(${theme.spacing(0)} + env(safe-area-inset-top, 0px))`, md: 'auto' },
                                        zIndex: { xs: 5, md: 'auto' },
                                        backgroundColor: { xs: 'background.paper', md: 'transparent' },
                                        boxShadow: { xs: '0 2px 4px rgba(0,0,0,0.06)', md: 'none' },
                                        borderBottom: { xs: 1, md: 0 },
                                        borderColor: { xs: 'divider', md: 'transparent' },
                                   }}
                              >
                                   {/* Horizontal tabs (mobile) */}
                                   <Tabs
                                        orientation="horizontal"
                                        value={type}
                                        onChange={(_, v) => setType(v)}
                                        variant="scrollable"
                                        allowScrollButtonsMobile
                                        sx={{
                                             display: { xs: 'flex', md: 'none' },
                                             px: 0.5,
                                             borderBottom: 1,
                                             borderColor: 'divider',
                                        }}
                                   >
                                        {NOTIFICATION_TYPES_MAP.map(nt => (
                                             <Tab
                                                  key={nt.value}
                                                  value={nt.value}
                                                  label={t(nt.labelToken)}
                                                  sx={{
                                                       // Horizontal: rely on global MuiTab root styles; just tweak spacing
                                                       px: 1.5,
                                                       minHeight: 42,
                                                       '&.Mui-selected': { fontWeight: 600 },
                                                  }}
                                             />
                                        ))}
                                   </Tabs>
                                   {/* Vertical tabs (desktop) */}
                                   <Tabs
                                        orientation="vertical"
                                        value={type}
                                        onChange={(_, v) => setType(v)}
                                        variant="scrollable"
                                        allowScrollButtonsMobile
                                        sx={{
                                             display: { xs: 'none', md: 'flex' },
                                             minHeight: '100%',
                                             '& .MuiTabs-indicator': {
                                                  left: 0,
                                                  width: 3,
                                                  borderRadius: 2,
                                             },
                                             // Provide space so indicator does not overlap centered text
                                             pr: 1,
                                        }}
                                   >
                                        {NOTIFICATION_TYPES_MAP.map(nt => (
                                             <Tab
                                                  key={nt.value}
                                                  value={nt.value}
                                                  label={t(nt.labelToken)}
                                                  sx={{
                                                       // Vertical: add left gutter; center content via wrapper defaults
                                                       px: 0,
                                                       pl: 5,
                                                       minHeight: 36,
                                                       width: '100%',
                                                       '& .MuiTab-wrapper': {
                                                            width: '100%',
                                                            justifyContent: 'center',
                                                       },
                                                       '&.Mui-selected': { fontWeight: 600 },
                                                  }}
                                             />
                                        ))}
                                   </Tabs>
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                   <GenericTable<Row>
                                        columns={columns}
                                        items={filtered}
                                        tableTitle={t(tokens.notifications.tableTitle)}
                                        tableSubtitle={t(tokens.notifications.tableSubtitle)}
                                        rowActions={[(item, openDialog) => (
                                             <>
                                                  <Tooltip title={item.is_read ? t(tokens.notifications.markUnread) : t(tokens.notifications.markRead)}>
                                                       <IconButton size="small" onClick={async () => {
                                                            const data = await markNotificationRead(item.id, !item.is_read);
                                                            if (data.success) {
                                                                 toast.success(!item.is_read ? t(tokens.notifications.markedRead) : t(tokens.notifications.markedUnread));
                                                                 setItems(prev => prev.map(n => n.id === item.id ? { ...n, is_read: !n.is_read } as Row : n));
                                                            }
                                                       }}>
                                                            <DoneAllIcon fontSize="small" color={item.is_read ? 'success' : 'disabled'} />
                                                       </IconButton>
                                                  </Tooltip>
                                                  <Tooltip title={t(tokens.common.btnDelete)}>
                                                       <IconButton size="small"
                                                            onClick={() =>
                                                                 openDialog({
                                                                      id: item.id, title: t(tokens.notifications.deleteConfirmTitle), onConfirm: async () => {
                                                                           const data = await deleteNotification(item.id);
                                                                           if (data.success) {
                                                                                toast.success(t(tokens.notifications.deleted));
                                                                           }
                                                                           setItems(prev => prev.filter(n => n.id !== item.id));
                                                                      }
                                                                 })}>
                                                            <DeleteIcon fontSize="small" />
                                                       </IconButton>
                                                  </Tooltip>
                                             </>
                                        )]}
                                   />
                              </Box>
                         </Box>
                    </Stack>
               </Card>
          </Container>
     );
}
