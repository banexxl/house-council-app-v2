import * as Yup from 'yup';

export type NotificationKind = 'system' | 'message' | 'reminder' | 'alert' | 'announcement' | 'other';

export const NOTIFICATION_TYPES = [
     'system',
     'message',
     'reminder',
     'alert',
     'announcement',
     'other',
] as const;

export interface BaseNotification {
     id?: string;
     type: NotificationKind;
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
     type: 'message';
     sender_id: string;
     receiver_id: string;
}

export interface AlertNotification extends BaseNotification {
     type: 'alert';
     severity?: 'low' | 'medium' | 'high';
}

export type Notification = BaseNotification | MessageNotification | AlertNotification;

export const notificationInitialValues: Partial<Notification> = {
     title: '',
     description: '',
     type: 'system',
     user_id: null,
     is_read: false
};

export const notificationValidationSchema = Yup.object({
     title: Yup.string().trim().min(2).max(200).required(),
     description: Yup.string().trim().min(2).required(),
     type: Yup.mixed<NotificationKind>().oneOf(NOTIFICATION_TYPES as unknown as NotificationKind[]).required(),
     client_id: Yup.string().nullable(),
     is_read: Yup.boolean().default(false),
     building_id: Yup.string().nullable(),
     user_id: Yup.string().nullable(),
     is_for_tenant: Yup.boolean().default(false),
     announcement_id: Yup.string().nullable(),
});
