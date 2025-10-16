// notifications/types.ts
import { tokens } from 'src/locales/tokens';

export type NotificationType =
     'all' | 'system' | 'message' | 'reminder' | 'alert' | 'announcement' | 'other';

export type NotificationChannel = 'whatsapp' | 'email' | 'push' | 'sms';

export type NotificationTypeMap = {
     value: NotificationType;
     labelToken: string;
};

export const NOTIFICATION_TYPES_MAP: NotificationTypeMap[] = [
     { value: 'all', labelToken: tokens.notifications.tabs.all },
     { value: 'system', labelToken: tokens.notifications.tabs.system },
     { value: 'message', labelToken: tokens.notifications.tabs.message },
     { value: 'reminder', labelToken: tokens.notifications.tabs.reminder },
     { value: 'alert', labelToken: tokens.notifications.tabs.alert },
     { value: 'announcement', labelToken: tokens.notifications.tabs.announcement },
     { value: 'other', labelToken: tokens.notifications.tabs.other },
] as const;

export interface BaseNotification {
     id?: string;
     type: NotificationTypeMap;        // stored as map on the server; db gets .value
     title: string;
     description: string;              // HTML or plain text (we’ll plainify for WA)
     created_at: string | Date;
     user_id: string | null;
     is_read: boolean;
     // optional FKs...
}

export interface AnnouncementNotification extends BaseNotification {
     announcement_id: string;
     title: string;
     description: string;
     created_at: string | Date;
     user_id: string | null;  // null = for all users
     is_read: boolean;
     is_for_tenant: boolean; // true = all users in tenant, false = all users in system
}

export interface MessageNotification extends BaseNotification {
     sender_id: string;
     receiver_id: string;
}
export interface AlertNotification extends BaseNotification {
     severity?: 'low' | 'medium' | 'high';
}

export type Notification = BaseNotification | MessageNotification | AlertNotification;

// Contact shape you already retrieve:
export type TenantContact = {
     user_id: string;
     email?: string | null;
     phone_number?: string | null;
     email_opt_in?: boolean | null;
     sms_opt_in?: boolean | null;         // you already have this
     whatsapp_opt_in?: boolean | null;    // reuse sms_opt_in or split if you prefer
};
