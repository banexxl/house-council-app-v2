
import Announcements from 'src/app/dashboard/announcements/announcement';
import { getAnnouncements } from 'src/app/actions/announcement/announcement-actions';

export default async function AnnouncementsPage() {

     const { success, data } = await getAnnouncements();

     return (
          <Announcements
               announcements={success && data ? data : []}
               tenants={[]}
               apartments={[]}
          />
     );
}
