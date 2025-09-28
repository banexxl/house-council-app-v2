'use server';

import { getViewer } from "src/libs/supabase/server-auth";
import NewLocation from "./new-location";
import { logout } from "src/app/auth/actions";
import { redirect } from "next/navigation";
import { getAllAddedLocationsByClientId, getAllLocations } from "src/app/actions/location/location-services";
import { readClientFromClientMemberID } from "src/app/actions/client/client-members";
import { da } from "date-fns/locale";

const Page = async () => {

     const { client, clientMember, tenant, admin } = await getViewer();
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
          const { success, data } = await readClientFromClientMemberID(clientMember.id);
          const { success: success2, data: data2 } = await getAllAddedLocationsByClientId(typeof data === 'string' ? data : data?.id!);
          locations = success2 ? data2! : [];
     } else if (tenant) {
          locations = [];
     }

     const mapBoxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY!;


     return (
          <NewLocation mapBoxAccessToken={mapBoxAccessToken} clientLocations={locations} />
     );
};

export default Page;
