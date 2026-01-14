import { Notification } from 'src/types/notification';
import NotificationsClient from './notifications';
import { getNotificationsForClient } from 'src/app/actions/notification/notification-actions';
import { getViewer } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { redirect } from 'next/navigation';

export default async function NotificationsPage() {
     const { customer, tenant, admin } = await getViewer();
     if (!client && !clientMember && !tenant && !admin) {
          redirect('/auth/login');
     }
     const { success, data } = await getNotificationsForClient();
     const notifications: Notification[] = success && data ? data : [];
     return <NotificationsClient initialNotifications={notifications} />;
}
