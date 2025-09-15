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
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';
import { markNotificationRead } from 'src/app/actions/notification/notification-actions';

const MAX_DISPLAY = 10;

type UUID = string;

async function getSignedInUserId(): Promise<UUID | null> {
  const { data, error } = await supabaseBrowserClient.auth.getUser();
  if (error) {
    console.error('[notifications] getUser failed', error.message);
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
        .limit(MAX_DISPLAY + 1); // fetch one extra for "+" badge logic

      if (!active) return;
      if (error) {
        console.error('[notifications] initial fetch failed', error.message);
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

  // 3) Realtime: listen only to this user's notifications
  useEffect(() => {
    if (!userId) return;

    const channelName = `notif_user_${userId}`;

    const channel = supabaseBrowserClient
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tblNotifications', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const evt = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
          const rowNew = payload.new;
          const rowOld = payload.old;

          // Keep only UNREAD items in state
          if (evt === 'INSERT' && rowNew?.is_read === false) {
            setNotifications(prev => {
              if (prev.some(n => n.id === rowNew.id)) return prev;
              const next = [{ ...rowNew, created_at: new Date(rowNew.created_at) }, ...prev];
              return next.slice(0, MAX_DISPLAY + 1);
            });
          }

          if (evt === 'UPDATE' && rowNew) {
            setNotifications(prev => {
              const idx = prev.findIndex(n => n.id === rowNew.id);
              const isUnread = rowNew.is_read === false;

              if (!isUnread) {
                // Became read -> remove if present
                if (idx === -1) return prev;
                const clone = [...prev];
                clone.splice(idx, 1);
                return clone;
              }

              // Still unread -> upsert
              if (idx === -1) {
                const next = [{ ...rowNew, created_at: new Date(rowNew.created_at) }, ...prev];
                return next.slice(0, MAX_DISPLAY + 1);
              }
              const clone = [...prev];
              clone[idx] = { ...clone[idx], ...rowNew, created_at: new Date(rowNew.created_at) };
              return clone;
            });
          }

          if (evt === 'DELETE' && rowOld?.id) {
            setNotifications(prev => prev.filter(n => n.id !== rowOld.id));
          }
        }
      )
      .subscribe((status) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[${channelName}] status: ${status}`);
        }
      });

    return () => {
      supabaseBrowserClient.removeChannel(channel).catch(console.error);
    };
  }, [userId]);

  // 4) Derived UI values
  const totalUnread = notifications.length;
  const displayNotifications = useMemo(() => notifications.slice(0, MAX_DISPLAY), [notifications]);
  const badgeContent = totalUnread > MAX_DISPLAY ? `${MAX_DISPLAY}+` : totalUnread;

  // 5) Actions (per-user rows → include user_id in UPDATE for safety)
  const handleRemoveOne = useCallback(async (notificationId: string): Promise<void> => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId)); // optimistic
    if (!userId) return;
    const { success, error } = await markNotificationRead(notificationId, true)
    console.log('success', success, 'error', error);


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
        if (error) console.error('[notifications] mark all read failed', error.message);
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
