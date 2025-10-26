'use server';

import { getViewer } from "src/libs/supabase/server-auth";
import NewLocation from "./new-location";
import { logout } from "src/app/auth/actions";
import { redirect } from "next/navigation";
import { getAllAddedLocationsByClientId, getAllLocations } from "src/app/actions/location/location-services";
import { resolveClientFromClientOrMember } from "src/app/actions/client/client-members";

const Page = async () => {

     const { client, clientMember, tenant, admin, userData } = await getViewer();
     if (!client && !clientMember && !tenant && !admin) {
          logout();
          redirect('/auth/login');
     }

     let locations = [];
     if (admin) {
          const { success, data } = await getAllLocations();
          locations = success && data ? data : [];
     } else if (client) {
          const { data } = await getAllAddedLocationsByClientId(client.id);
          locations = data ?? [];
     } else if (clientMember) {
          const { success, data } = await resolveClientFromClientOrMember(clientMember.id);
          const { success: success2, data: data2 } = await getAllAddedLocationsByClientId(data?.id!);
          locations = success2 ? data2! : [];
     } else if (tenant) {
          locations = [];
          redirect('/dashboard/products');
     }

     const mapBoxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY!;


     return (
          <NewLocation
               mapBoxAccessToken={mapBoxAccessToken}
               clientLocations={locations}
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
