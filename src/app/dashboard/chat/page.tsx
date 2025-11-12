'use server';

import { getViewer, type UserDataCombined } from "src/libs/supabase/server-auth";
import { logout } from "src/app/auth/actions";
import { redirect } from "next/navigation";
import { resolveClientFromClientOrMember } from "src/app/actions/client/client-members";
import { getAllBuildingsFromClient, getAllBuildings } from "src/app/actions/building/building-actions";
import { getBuildingTenants } from "src/app/actions/tenant/tenant-actions";
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server';
import { TABLES } from 'src/libs/supabase/tables';
import { ChatPageClient } from "./chat-client";

export default async function Page() {
  // Get the current user and their role
  const viewerData = await getViewer();
  const { client, clientMember, tenant, admin } = viewerData;

  // Redirect if not authenticated
  if (!client && !clientMember && !tenant && !admin) {
    logout();
    redirect('/auth/login');
  }

  // Get building context based on user type
  let buildingId: string | undefined;
  let buildings: any[] = [];
  let userType: 'admin' | 'client' | 'clientMember' | 'tenant';

  if (admin) {
    userType = 'admin';
    // Admins can access all buildings - we'll use the first building or allow them to select
    const { success, data } = await getAllBuildings();
    buildings = success ? data! : [];
    buildingId = buildings.length > 0 ? buildings[0].id : undefined;
  } else if (client) {
    userType = 'client';
    // Clients can access their own buildings
    const { success, data } = await getAllBuildingsFromClient(client.id);
    buildings = success ? data! : [];
    buildingId = buildings.length > 0 ? buildings[0].id : undefined;
  } else if (clientMember) {
    userType = 'clientMember';
    // Client members access buildings through their client
    const { success, data } = await resolveClientFromClientOrMember(clientMember.id);
    if (success && data?.id) {
      const { success: success2, data: data2 } = await getAllBuildingsFromClient(data.id);
      buildings = success2 ? data2! : [];
      buildingId = buildings.length > 0 ? buildings[0].id : undefined;
    }
  } else if (tenant) {
    userType = 'tenant';
    // For tenants, get their building context and building ID
    const result = await getBuildingTenants();

    if (result.success && result.data && result.data.length > 0) {
      // Get the building ID from the tenant's apartment relationship
      try {
        const serviceSupabase = await useServerSideSupabaseAnonClient();
        const { data: tenantData } = await serviceSupabase
          .from(TABLES.TENANTS)
          .select(`
            apartment_id,
            ${TABLES.APARTMENTS}!inner(building_id)
          `)
          .eq('user_id', viewerData.userData?.id)
          .single();

        if (tenantData && (tenantData as any)[TABLES.APARTMENTS]?.building_id) {
          buildingId = (tenantData as any)[TABLES.APARTMENTS].building_id;
        }
      } catch (error) {
        console.error('Error getting tenant building ID:', error);
        // Fallback: let chat actions auto-detect building from tenant context
        buildingId = undefined;
      }
    }
  } else {
    // This should never happen due to the earlier auth check, but just in case
    redirect('/dashboard');
  }

  // If no building access, redirect or show error
  if (!buildingId && buildings.length === 0 && userType !== 'tenant') {
    redirect('/dashboard');
  }

  // For tenants, if getBuildingUsers failed or no building ID found, they don't have access
  if (userType === 'tenant' && !buildingId) {
    redirect('/dashboard');
  }

  return (
    <ChatPageClient
      buildingId={buildingId}
      userType={userType}
      buildings={buildings}
      user={viewerData}
    />
  );
}