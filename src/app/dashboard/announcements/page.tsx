import Announcements from 'src/app/dashboard/announcements/announcement';
import { getAnnouncements } from 'src/app/actions/announcement/announcement-actions';
import { getViewer } from 'src/libs/supabase/server-auth';
import { getAllBuildingsFromClient } from 'src/app/actions/building/building-actions';
import { redirect } from 'next/navigation';
import { Card, Container } from '@mui/material';

export default async function AnnouncementsPage() {

     const { customer, tenant, admin } = await getViewer();

     if (!customer && !tenant && !admin) {
          redirect('/auth/login');
     }

     if (!customer) {
          redirect('/dashboard');
     }

     // Parallel fetching. Only buildings constrained by client (foreign key). Others full unless you choose to filter later.
     const [annRes, buildingsRes] = await Promise.all([
          getAnnouncements(),
          getAllBuildingsFromClient(customer?.id!),
     ]);

     const announcements = annRes.success && annRes.data ? annRes.data : [];
     const buildings = (buildingsRes as any).error ? [] : (buildingsRes as any).data || [];

     return (
          <Container maxWidth="xl">
               <Card sx={{ p: 2 }}>
                    <Announcements
                         announcements={announcements}
                         customer={customer}
                         buildings={buildings}
                    />
               </Card>
          </Container >
     );
}
