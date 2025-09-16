import { getViewer } from 'src/libs/supabase/server-auth';
import { redirect } from 'next/navigation';
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { getPublishedAnnouncementsForBuildings } from 'src/app/actions/announcement/announcement-actions';
import TenantAnnouncementsViewer from 'src/app/dashboard/announcements/tenant/tenant-announcements-viewer';
import { logout } from 'src/app/auth/actions';

// Server component: lists published announcements for the tenant's building(s)
export default async function TenantAnnouncementsPage() {

     const { tenant, client, clientMember } = await getViewer();

     if (!client && !tenant && !clientMember) {
          logout();
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
               .from('tblApartments')
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
     return <TenantAnnouncementsViewer announcements={announcements} buildings={buildingsMap} />;
}
