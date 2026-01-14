'use server';

import { getViewer } from "src/libs/supabase/server-auth";
import NewLocation from "./new-location";
import { redirect } from "next/navigation";
import { getAllAddedLocationsByClientId, getAllLocations, getAllOtherClientsLocations } from "src/app/actions/location/location-services";
import { resolveClientFromClientOrMember } from "src/app/actions/client/client-members";
import { BuildingLocation } from "src/types/location";

const Page = async () => {

     const { customer, tenant, admin, userData } = await getViewer();
     if (!client && !clientMember && !tenant && !admin) {
          redirect('/auth/login');
     }

     let locations: BuildingLocation[] = [];
     let occupiedLocations: BuildingLocation[] = [];
     if (admin) {
          const { success, data } = await getAllLocations();
          locations = success && data ? data : [];
     } else if (client) {
          const { data } = await getAllAddedLocationsByClientId(client.id);
          locations = data ?? [];
          const { data: others } = await getAllOtherClientsLocations(client.id);
          occupiedLocations = others ?? [];
     } else if (clientMember) {
          const { success, data } = await resolveClientFromClientOrMember(clientMember.id);
          const { success: success2, data: data2 } = await getAllAddedLocationsByClientId(data?.id!);
          locations = success2 ? data2! : [];
          const { data: others } = await getAllOtherClientsLocations(clientMember.id);
          occupiedLocations = others ?? [];
     } else if (tenant) {
          locations = [];
          redirect('/dashboard/social/profile');
     }

     const mapBoxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY!;


     return (
          <NewLocation
               mapBoxAccessToken={mapBoxAccessToken}
               clientLocations={locations}
               occupiedLocations={occupiedLocations}
               userData={{
                    client: client ?? null,
                    clientMember: clientMember ?? null,
                    tenant: tenant ?? null,
                    admin: admin ?? null,
                    userData: userData ?? null
               }}
          />
     );
};

export default Page;
