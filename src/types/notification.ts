import * as Yup from 'yup';

export type NotificationKind = 'system' | 'message' | 'reminder' | 'alert' | 'announcement' | 'other';

export interface BaseNotification {
     id: string;
     type: NotificationKind;
     title: string;
     description: string;
     created_at: Date; // ISO string from DB
     user_id: string | null;
     is_read: boolean;
     building_id: string;
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
     type: Yup.mixed<NotificationKind>().oneOf(['system', 'message', 'reminder', 'alert']).required(),
     client_id: Yup.string().nullable(),
     is_read: Yup.boolean().default(false)
});
