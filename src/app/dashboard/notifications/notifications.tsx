'use client';

import { useState, useMemo } from 'react';
import { Box, Tabs, Tab, IconButton, Tooltip, Container, Stack, Typography, Card } from '@mui/material';
import { GenericTable, TableColumn } from 'src/components/generic-table';
import { Notification } from 'src/types/notification';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DeleteIcon from '@mui/icons-material/Delete';
import { deleteNotification, markNotificationRead } from 'src/app/actions/notification/notification-actions';
import toast from 'react-hot-toast';

interface NotificationsClientProps {
     initialNotifications: Notification[];
}

const NOTIFICATION_TYPES: { value: string; label: string }[] = [
     { value: 'all', label: 'All' },
     { value: 'system', label: 'System' },
     { value: 'message', label: 'Messages' },
     { value: 'reminder', label: 'Reminders' },
     { value: 'alert', label: 'Alerts' },
     { value: 'announcement', label: 'Announcements' },
     { value: 'other', label: 'Other' }
];

export default function NotificationsClient({ initialNotifications }: NotificationsClientProps) {
     const [type, setType] = useState<string>('all');
     const [items, setItems] = useState<Notification[]>(initialNotifications);

     const filtered = useMemo(() => {
          if (type === 'all') return items;
          return items.filter(n => n.type === type);
     }, [items, type]);

     const columns: TableColumn<Notification>[] = useMemo(() => {
          const base: TableColumn<Notification>[] = [
               { key: 'title', label: 'Title' },
               { key: 'description', label: 'Description', render: v => (v as string).slice(0, 80) + ((v as string).length > 80 ? '…' : '') },
               { key: 'created_at', label: 'Created', render: v => new Date(v as string).toLocaleString() },
               { key: 'is_read', label: 'Read' }
          ];
          if (type === 'reminder') {
               base.splice(1, 0, { key: 'scheduled_for' as any, label: 'Scheduled For' });
          }

          if (type === 'message') {
               // Cast to include potential sender/receiver fields
               base.splice(1, 0, { key: 'sender_id' as any, label: 'Sender' });
               base.splice(2, 0, { key: 'receiver_id' as any, label: 'Receiver' });
          }
          if (type === 'alert') {
               base.splice(1, 0, { key: 'severity' as any, label: 'Severity' });
          }
          if (type !== 'all') {
               base.unshift({ key: 'type', label: 'Type' });
          }
          return base;
     }, [type]);

     return (
          <Container maxWidth="xl">
               <Typography variant="h4" sx={{ mb: 3 }}>Notification Center</Typography>
               <Card>
                    <Stack spacing={4}>
                         <Box sx={{ display: 'flex', gap: 3 }}>
                              <Box sx={{ width: 180, pt: 1 }}>
                                   <Tabs
                                        orientation="vertical"
                                        value={type}
                                        onChange={(_, v) => setType(v)}
                                        variant="scrollable"
                                   >
                                        {NOTIFICATION_TYPES.map(nt => (
                                             <Tab key={nt.value} value={nt.value} label={nt.label} />
                                        ))}
                                   </Tabs>
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                   <GenericTable
                                        columns={columns}
                                        items={filtered}
                                        tableTitle="notifications.title"
                                        tableSubtitle="notifications.subtitle"
                                        rowActions={[(item, openDialog) => (
                                             <>
                                                  <Tooltip title={item.is_read ? 'Mark as unread' : 'Mark as is_read'}>
                                                       <IconButton size="small" onClick={async () => {
                                                            const data = await markNotificationRead(item.id, !item.is_read);
                                                            if (data.success) {
                                                                 toast.success(`Notification marked as ${!item.is_read ? 'read' : 'unread'}`);
                                                                 setItems(prev => prev.map(n => n.id === item.id ? { ...n, is_read: !n.is_read } : n));
                                                            }
                                                       }}>
                                                            <DoneAllIcon fontSize="small" color={item.is_read ? 'success' : 'disabled'} />
                                                       </IconButton>
                                                  </Tooltip>
                                                  <Tooltip title="Delete">
                                                       <IconButton size="small"
                                                            onClick={() =>
                                                                 openDialog({
                                                                      id: item.id, title: 'Delete notification?', onConfirm: async () => {
                                                                           const data = await deleteNotification(item.id);
                                                                           if (data.success) {
                                                                                toast.success('Notification deleted');
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
