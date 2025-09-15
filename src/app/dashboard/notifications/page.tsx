import { Notification } from 'src/types/notification';
import NotificationsClient from './notifications';
import { getNotificationsForClient } from 'src/app/actions/notification/notification-actions';

export default async function NotificationsPage() {
     const { success, data } = await getNotificationsForClient();
     const notifications: Notification[] = success && data ? data : [];
     return <NotificationsClient initialNotifications={notifications} />;
}
