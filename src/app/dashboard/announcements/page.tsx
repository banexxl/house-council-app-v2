
import Announcements from 'src/app/dashboard/announcements/announcement';
import { getAnnouncements } from 'src/app/actions/announcement/announcement-actions';
import { getViewer } from 'src/libs/supabase/server-auth';
import { logout } from 'src/app/auth/actions';
import { getAllBuildingsFromClient } from 'src/app/actions/building/building-actions';
import { redirect } from 'next/navigation';

export default async function AnnouncementsPage() {

     const { client, tenant, admin, clientMember } = await getViewer();

     if (!client && !tenant && !admin && !clientMember) {
          logout();
     }

     if (!client && !clientMember) {
          redirect('/dashboard');
     }

     // Parallel fetching. Only buildings constrained by client (foreign key). Others full unless you choose to filter later.
     const [annRes, buildingsRes] = await Promise.all([
          getAnnouncements(),
          getAllBuildingsFromClient(client?.id! || clientMember?.client_id!),
     ]);

     const announcements = annRes.success && annRes.data ? annRes.data : [];
     const buildings = (buildingsRes as any).error ? [] : (buildingsRes as any).data || [];

     return (
          <Announcements
               announcements={announcements}
               client={client!}
               buildings={buildings}
          />
     );
}
