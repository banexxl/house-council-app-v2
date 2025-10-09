import { tokens } from 'src/locales/tokens';

export type NotificationType =
     'all' |
     'system' |
     'message' |
     'reminder' |
     'alert' |
     'announcement' |
     'other';

export const NOTIFICATION_TYPES = [
     'all',
     'system',
     'message',
     'reminder',
     'alert',
     'announcement',
     'other',
] as NotificationType[];

export type NotificationTypeMap = {
     value: NotificationType;
     labelToken: string;
}

export const NOTIFICATION_TYPES_MAP: NotificationTypeMap[] = [
     { value: 'all', labelToken: tokens.notifications.tabs.all },
     { value: 'system', labelToken: tokens.notifications.tabs.system },
     { value: 'message', labelToken: tokens.notifications.tabs.message },
     { value: 'reminder', labelToken: tokens.notifications.tabs.reminder },
     { value: 'alert', labelToken: tokens.notifications.tabs.alert },
     { value: 'announcement', labelToken: tokens.notifications.tabs.announcement },
     { value: 'other', labelToken: tokens.notifications.tabs.other }
] as const;

export interface BaseNotification {
     id?: string;
     type: NotificationTypeMap;
     title: string;
     description: string;
     // Accept either Date or ISO string to match DB/client usage
     created_at: string | Date;
     user_id: string | null;
     is_read: boolean;
     // Optional foreign keys, present depending on notification kind

}

export interface AnnouncementNotification extends BaseNotification {
     building_id?: string | null;
     client_id?: string | null;
     announcement_id?: string | null;
     is_for_tenant?: boolean;
}

// Extended shapes depending on type
export interface MessageNotification extends BaseNotification {
     type: NotificationTypeMap;
     sender_id: string;
     receiver_id: string;
}

export interface AlertNotification extends BaseNotification {
     type: NotificationTypeMap;
     severity?: 'low' | 'medium' | 'high';
}

export type Notification = BaseNotification | MessageNotification | AlertNotification;
