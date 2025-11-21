import {
  NOTIFICATION_TYPES_MAP,
  type Notification,
  type BaseNotification,
  type MessageNotification,
  type AlertNotification,
  type NotificationType,
  type NotificationTypeMap,
  type SocialNotification,
  AnnouncementNotification,
} from 'src/types/notification';

// Resolve a DB enum value or an existing map into a NotificationTypeMap
export function toNotificationTypeMap(value: NotificationType | NotificationTypeMap): NotificationTypeMap {
  if (typeof value === 'object' && (value as any)?.value) {
    return value as NotificationTypeMap;
  }
  const found = NOTIFICATION_TYPES_MAP.find((m) => m.value === value);
  return found ?? NOTIFICATION_TYPES_MAP.find((m) => m.value === 'other')!;
}

// Convert a raw DB row into a Notification object with translated type token mapping
export function hydrateNotificationFromDb<T extends Notification = Notification>(row: any): T {
  const mappedType = toNotificationTypeMap((row?.type ?? 'other') as NotificationType);
  return { ...(row as T), type: mappedType } as T;
}

export function hydrateNotificationsFromDb<T extends Notification = Notification>(rows: any[]): T[] {
  return (rows || []).map((r) => hydrateNotificationFromDb<T>(r));
}

// Generic creator that ensures the `type` is a NotificationTypeMap and merges defaults
export function createNotification<T extends BaseNotification>(
  input: Omit<T, 'type'> & { type: NotificationType | NotificationTypeMap }
): T {
  const type = toNotificationTypeMap(input.type);
  const created_at = (input as any).created_at ?? new Date().toISOString();
  const is_read = (input as any).is_read ?? false;
  return { ...(input as any), type, created_at, is_read } as T;
}

// Specific helpers for common types
export function createAnnouncementNotification(
  input: Omit<AnnouncementNotification, 'type'>
): AnnouncementNotification {
  return createNotification<AnnouncementNotification>({ ...(input as any), type: 'announcement' });
}

export function createMessageNotification(
  input: Omit<MessageNotification, 'type'>
): MessageNotification {
  return createNotification<MessageNotification>({ ...(input as any), type: 'message' });
}

export function createAlertNotification(
  input: Omit<AlertNotification, 'type'> & { severity?: 'low' | 'medium' | 'high' }
): AlertNotification {
  return createNotification<AlertNotification>({ ...(input as any), type: 'alert' });
}

