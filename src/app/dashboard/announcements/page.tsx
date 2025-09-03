
import Announcement from 'src/app/dashboard/announcements/announcement';

export default async function AnnouncementsPage() {


     return (
          <Announcement
               announcements={[]}
               categories={[]}
               tenants={[]}
               apartments={[]}
          />
     );
}
