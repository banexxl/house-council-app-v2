import { getViewer } from 'src/libs/supabase/server-auth';
import { redirect } from 'next/navigation';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { getPublishedAnnouncementsForBuildings } from 'src/app/actions/announcement/announcement-actions';
import TenantAnnouncementsViewer from 'src/app/dashboard/announcements/tenant/tenant-announcements-viewer';
import { TABLES } from 'src/libs/supabase/tables';
import { Card, Container } from '@mui/material';

// Server component: lists published announcements for the tenant's building(s)
export default async function TenantAnnouncementsPage() {

     const { admin, tenant, customer } = await getViewer();

     if (!admin && !customer && !tenant) {
          redirect('/auth/login');
     }

     // Only tenants (optionally allow client/clientMember impersonation later)
     if (!tenant) {
          redirect('/');
     }

     const supabase = await useServerSideSupabaseAnonClient();

     // Resolve tenant's building(s). Assuming tenant has apartment with building relation.
     // Adjust query if schema differs.
     let buildingIds: string[] = [];
     try {
          const { data: apt } = await supabase
               .from(TABLES.APARTMENTS)
               .select('building_id')
               .eq('id', tenant.apartment_id)
               .maybeSingle();
          if (apt?.building_id) buildingIds = [apt.building_id];
     } catch { /* ignore */ }

     if (buildingIds.length === 0) {
          return <div>No building associated with your account.</div>;
     }

     const publishedRes = await getPublishedAnnouncementsForBuildings(buildingIds);
     if (!publishedRes.success) return <div>Failed to load announcements.</div>;
     const announcements = publishedRes.data || [];
     const buildingsMap = publishedRes.buildings || {};
     return (
          <Container maxWidth="xl">
               <Card sx={{ p: 2 }}>
                    <TenantAnnouncementsViewer announcements={announcements} buildings={buildingsMap} />
               </Card>
          </Container>
     )
}
