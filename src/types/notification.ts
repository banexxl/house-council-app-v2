// notifications/types.ts
import { tokens } from 'src/locales/tokens';

export type NotificationType =
     'all' | 'system' | 'message' | 'reminder' | 'alert' | 'calendar' | 'announcement' | 'social' | 'other';

export type NotificationChannel = 'whatsapp' | 'email' | 'push' | 'sms';

export type NotificationTypeMap = {
     value: NotificationType;
     labelToken: string;
};

export type NotificationActionTokenMap = {
     key: NotificationAction;
     translationToken: string;
};

export type NotificationAction =
     | 'postCreated'
     | 'commentCreated'
     | 'reactionAdded';

export const NOTIFICATION_TYPES_MAP: NotificationTypeMap[] = [
     { value: 'all', labelToken: tokens.notifications.tabs.all },
     { value: 'system', labelToken: tokens.notifications.tabs.system },
     { value: 'message', labelToken: tokens.notifications.tabs.message },
     { value: 'reminder', labelToken: tokens.notifications.tabs.reminder },
     { value: 'alert', labelToken: tokens.notifications.tabs.alert },
     { value: 'announcement', labelToken: tokens.notifications.tabs.announcement },
     { value: 'social', labelToken: tokens.notifications.tabs.social },
     { value: 'other', labelToken: tokens.notifications.tabs.other },
] as const;

export const NOTIFICATION_ACTION_TOKENS: NotificationActionTokenMap[] = [
     { key: 'postCreated', translationToken: 'notifications.social.postCreated' },
     { key: 'commentCreated', translationToken: 'notifications.social.commentCreated' },
     { key: 'reactionAdded', translationToken: 'notifications.social.reactionAdded' },
] as const;

export interface BaseNotification {
     id?: string;
     type: NotificationTypeMap;        // stored as map on the server; db gets .value
     action_token: string;
     url?: string;
     description: string;
     created_at: string;
     updated_at?: string;
     is_read: boolean;
     building_id: string;
     user_id: string;
     // optional FKs...
}

export interface AnnouncementNotification extends BaseNotification {
     announcement_id: string;
     is_for_tenant: boolean; // true = all users in tenant, false = all users in system
}

export interface MessageNotification extends BaseNotification {
     sender_id: string;
     receiver_id: string;
}

export interface AlertNotification extends BaseNotification {
     severity?: 'low' | 'medium' | 'high';
}

export interface SocialNotification extends BaseNotification {
     related_post_id?: string;
     related_comment_id?: string;
}

export interface CalendarNotification extends BaseNotification {
     all_day: boolean;
     calendar_event_type: string;
     start_date_time: string;
     end_date_time: string;
}

export type Notification = BaseNotification & (MessageNotification | AlertNotification | SocialNotification);

// Contact shape you already retrieve:
export type TenantContact = {
     user_id: string;
     email?: string | null;
     phone_number?: string | null;
     email_opt_in?: boolean | null;
     sms_opt_in?: boolean | null;
     whatsapp_opt_in?: boolean | null;
};
