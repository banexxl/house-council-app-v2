import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Bell01Icon from '@untitled-ui/icons-react/build/esm/Bell01';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import SvgIcon from '@mui/material/SvgIcon';
import Tooltip from '@mui/material/Tooltip';

import { usePopover } from 'src/hooks/use-popover';

import { NotificationsPopover } from './notifications-popover';
import { Notification } from 'src/types/notification';
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';
import { initNotificationsRealtime } from 'src/realtime/sb-realtime';
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';
import { markNotificationRead } from 'src/app/actions/notification/notification-actions';
import toast from 'react-hot-toast';
import { isClientUserId } from 'src/app/actions/client/client-actions';

const MAX_DISPLAY = 10;

type UUID = string;

async function getSignedInUserId(): Promise<UUID | null> {
  const { data, error } = await supabaseBrowserClient.auth.getUser();
  if (error) {
    toast.error('Failed to get user info');
    return null;
  }
  return data.user?.id ?? null;
}

export function useNotifications() {

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<UUID | null>(null);


  // 1) Resolve the current user id once
  useEffect(() => {
    let active = true;
    (async () => {
      const uid = await getSignedInUserId();
      if (!active) return;
      setUserId(uid);
    })();
    return () => { active = false; };
  }, []);

  // 2) Initial fetch of unread notifications scoped to this user
  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      const { data, error } = await supabaseBrowserClient
        .from('tblNotifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(MAX_DISPLAY + 1);

      if (!active) return;
      if (error) {
        toast.error('Failed to fetch notifications');
        return;
      }

      const mapped: Notification[] = (data ?? []).map((r: any) => ({
        ...r,
        created_at: new Date(r.created_at),
      }));

      setNotifications(mapped);
    })();
    return () => { active = false; };
  }, [userId]);

  // 3) Realtime: non-clients => INSERT only; clients => DELETE
  useEffect(() => {
    if (!userId) return;
    let cleanup: (() => Promise<void>) | null = null;
    (async () => {
      const isUserClient = await isClientUserId(userId);

      cleanup = await initNotificationsRealtime((payload: any) => {
        const eventType = payload.eventType;

        // Always sanity-check row references depending on event type
        const rowNew = payload.new;
        const rowOld = payload.old;

        // Helper: add (only unread) if not already present
        const addIfNeeded = (row: any) => {
          if (!row) return;
          if (row.user_id !== userId) return;
          if (row.is_read !== false) return; // we store only unread
          setNotifications(prev => {
            if (prev.some(n => n.id === row.id)) return prev;
            const next = [{ ...row, created_at: new Date(row.created_at) }, ...prev];
            return next.slice(0, MAX_DISPLAY + 1);
          });
        };

        if (!isUserClient) {
          // Non-client users: only process INSERT events
          if (eventType !== 'INSERT') return;
          addIfNeeded(rowNew);
          return;
        }

        // Client users: handle INSERT, DELETE
        switch (eventType) {
          case 'INSERT': { addIfNeeded(rowNew); break; }
          case 'DELETE': {
            const deleted = rowOld;
            if (!deleted || deleted.user_id !== userId) return;
            setNotifications(prev => prev.filter(n => n.id !== deleted.id));
            break;
          }
          default:
            break;
        }
      });
    })();

    return () => { if (cleanup) cleanup().catch(() => toast.error('Failed to clean up notifications')); };
  }, [userId]);

  // 4) Derived UI values
  const totalUnread = notifications.length;
  const displayNotifications = useMemo(() => notifications.slice(0, MAX_DISPLAY), [notifications]);
  const badgeContent = totalUnread > MAX_DISPLAY ? `${MAX_DISPLAY}+` : totalUnread;

  // 5) Actions (per-user rows → include user_id in UPDATE for safety)
  const handleRemoveOne = useCallback(async (notificationId: string): Promise<void> => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId)); // optimistic
    if (!userId) return;
    const { success } = await markNotificationRead(notificationId, true)
    if (!success) {
      toast.error('Failed to mark notification as read');
    }
  }, [userId]);

  const handleMarkAllAsRead = useCallback((): void => {
    const ids = notifications.map(n => n.id);
    setNotifications([]); // optimistic
    if (!userId || ids.length === 0) return;

    supabaseBrowserClient
      .from('tblNotifications')
      .update({ is_read: true })
      .in('id', ids)
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error) toast.error('Failed to mark all notifications as read');
      });
  }, [userId, notifications]);

  return {
    handleMarkAllAsRead,
    handleRemoveOne,
    notifications: displayNotifications,
    badgeContent,
    totalUnread,
  };
}
export const NotificationsButton: FC = () => {

  const popover = usePopover<HTMLButtonElement>();
  const { handleRemoveOne, handleMarkAllAsRead, notifications, badgeContent } = useNotifications();
  const { t } = useTranslation();

  return (
    <>
      <Tooltip title={t(tokens.notifications.popoverTitle)}>
        <IconButton
          ref={popover.anchorRef}
          onClick={popover.handleOpen}
        >
          <Badge color="error" badgeContent={badgeContent}>
            <SvgIcon>
              <Bell01Icon />
            </SvgIcon>
          </Badge>
        </IconButton>
      </Tooltip>
      <NotificationsPopover
        anchorEl={popover.anchorRef.current}
        notifications={notifications}
        onClose={popover.handleClose}
        onMarkAllAsRead={handleMarkAllAsRead}
        onRemoveOne={handleRemoveOne}
        open={popover.open}
      />
    </>
  );
};
