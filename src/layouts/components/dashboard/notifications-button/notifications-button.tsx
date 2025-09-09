import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Bell01Icon from '@untitled-ui/icons-react/build/esm/Bell01';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import SvgIcon from '@mui/material/SvgIcon';
import Tooltip from '@mui/material/Tooltip';

import { usePopover } from 'src/hooks/use-popover';

import { NotificationsPopover } from './notifications-popover';
import { initNotificationsRealtime } from 'src/realtime/sb-realtime';
import { Notification } from 'src/types/notification';
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';

const MAX_DISPLAY = 10;

const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]); // all unread

  // Initial fetch of unread notifications
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabaseBrowserClient
        .from('tblNotifications')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(MAX_DISPLAY + 1); // fetch one extra to know if more exist
      if (!active) return;
      if (error) {
        console.error('[notifications] fetch unread failed', error.message);
        return;
      }
      const mapped: Notification[] = (data || []).map((r: any) => ({
        ...r,
        created_at: new Date(r.created_at)
      }));
      setNotifications(mapped); // we keep full (<= 11) for badge logic
    })();
    return () => { active = false; };
  }, []);

  // Realtime subscription for unread changes
  useEffect(() => {
    let stop: undefined | (() => Promise<void>);
    (async () => {
      stop = await initNotificationsRealtime((payload: any) => {
        console.log('payload', payload);
        const evt = payload.eventType;
        const rowNew = payload.new;
        const rowOld = payload.old;
        // INSERT: add if still unread
        if (evt === 'INSERT' && rowNew && rowNew.is_read === false) {
          setNotifications(prev => {
            if (prev.find(n => n.id === rowNew.id)) return prev; // dedupe
            return [{ ...rowNew, created_at: new Date(rowNew.created_at) }, ...prev];
          });
        }
        // UPDATE: handle read flag transitions
        if (evt === 'UPDATE' && rowNew) {
          setNotifications(prev => {
            const idx = prev.findIndex(n => n.id === rowNew.id);
            const isUnread = rowNew.is_read === false;
            if (idx === -1) {
              // became unread (rare) -> add
              if (isUnread) return [{ ...rowNew, created_at: new Date(rowNew.created_at) }, ...prev];
              return prev;
            }
            // existed
            if (!isUnread) {
              // mark as read -> remove from unread list
              const clone = [...prev];
              clone.splice(idx, 1);
              return clone;
            }
            // still unread -> update
            const clone = [...prev];
            clone[idx] = { ...clone[idx], ...rowNew, created_at: new Date(rowNew.created_at) };
            return clone;
          });
        }
        // DELETE: remove if present
        if (evt === 'DELETE' && rowOld?.id) {
          setNotifications(prev => prev.filter(n => n.id !== rowOld.id));
        }
      });
    })();
    return () => { if (stop) stop().catch(console.error); };
  }, []);

  const totalUnread = notifications.length; // may be > MAX_DISPLAY (we fetched MAX_DISPLAY+1)
  const displayNotifications = useMemo(() => notifications.slice(0, MAX_DISPLAY), [notifications]);
  const badgeContent = totalUnread > MAX_DISPLAY ? `${MAX_DISPLAY}+` : totalUnread;

  const handleRemoveOne = useCallback((notificationId: string): void => {
    // mark single as read (optimistic)
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    supabaseBrowserClient
      .from('tblNotifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .then(({ error }) => {
        if (error) console.error('[notifications] mark single read failed', error.message);
      });
  }, []);

  const handleMarkAllAsRead = useCallback((): void => {
    // optimistic clear
    const ids = notifications.map(n => n.id);
    setNotifications([]);
    if (ids.length === 0) return;
    supabaseBrowserClient
      .from('tblNotifications')
      .update({ is_read: true })
      .in('id', ids)
      .then(({ error }) => {
        if (error) console.error('[notifications] mark all read failed', error.message);
      });
  }, [notifications]);

  return {
    handleMarkAllAsRead,
    handleRemoveOne,
    notifications: displayNotifications,
    badgeContent,
    totalUnread,
  };
};

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
