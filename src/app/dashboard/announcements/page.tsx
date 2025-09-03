
import Announcement from 'src/app/dashboard/announcements/announcement';
import { getAnnouncements } from 'src/app/actions/announcement/announcement-actions';

export default async function AnnouncementsPage() {
     const ann = await getAnnouncements();
     const announcements = ann.success && ann.data ? ann.data.map(a => ({ id: a.id!, title: a.title, pinned: a.pinned, archived: a.archived })) : [];

     return (
          <Announcement
               announcements={announcements}
               tenants={[]}
               apartments={[]}
          />
     );
}
