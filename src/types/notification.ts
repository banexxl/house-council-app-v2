import * as Yup from 'yup';

export type NotificationKind = 'system' | 'message' | 'reminder' | 'alert' | 'announcement' | 'other';

export interface BaseNotification {
     id: string;
     type: NotificationKind;
     title: string;
     description: string;
     created_at: string; // ISO string from DB
     client_id: string | null;
     read: boolean;
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
     client_id: null,
     read: false
};

export const notificationValidationSchema = Yup.object({
     title: Yup.string().trim().min(2).max(200).required(),
     description: Yup.string().trim().min(2).required(),
     type: Yup.mixed<NotificationKind>().oneOf(['system', 'message', 'reminder', 'alert']).required(),
     client_id: Yup.string().nullable(),
     read: Yup.boolean().default(false)
});
