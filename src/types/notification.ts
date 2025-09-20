import { tokens } from 'src/locales/tokens';
import * as Yup from 'yup';

export type NotificationType =
     'system' |
     'message' |
     'reminder' |
     'alert' |
     'announcement' |
     'other';

export const NOTIFICATION_TYPES = [
     'system',
     'message',
     'reminder',
     'alert',
     'announcement',
     'other',
] as const;

export type NotificationTypeMap = {
     value: NotificationType;
     labelToken: string;
}

export const NOTIFICATION_TYPES_MAP: NotificationTypeMap[] = [
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

export const notificationInitialValues: Partial<Notification> = {
     title: '',
     description: '',
     type: NOTIFICATION_TYPES_MAP[0],
     user_id: null,
     is_read: false
};

export const notificationValidationSchema = Yup.object({
     title: Yup.string().trim().min(2).max(200).required(),
     description: Yup.string().trim().min(2).required(),
     type: Yup.mixed<NotificationType>().oneOf(NOTIFICATION_TYPES as unknown as NotificationType[]).required(),
     client_id: Yup.string().nullable(),
     is_read: Yup.boolean().default(false),
     building_id: Yup.string().nullable(),
     user_id: Yup.string().nullable(),
     is_for_tenant: Yup.boolean().default(false),
     announcement_id: Yup.string().nullable(),
});
