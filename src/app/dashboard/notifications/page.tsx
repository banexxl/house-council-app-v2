import { getNotifications } from 'src/app/actions/notification/notification-actions';
import { Notification } from 'src/types/notification';
import NotificationsClient from './notifications';

export default async function NotificationsPage() {
     const res = await getNotifications();
     const notifications: Notification[] = res.success && res.data ? res.data : [];
     return <NotificationsClient initialNotifications={notifications} />;
}
