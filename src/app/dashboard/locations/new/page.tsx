'use server';

import { getViewer } from "src/libs/supabase/server-auth";
import NewLocation from "./new-location";
import { redirect } from "next/navigation";
import { getAllAddedLocationsByClientId, getAllLocations, getAllOtherClientsLocations } from "src/app/actions/location/location-services";
import { BuildingLocation } from "src/types/location";

const Page = async () => {

     const { customer, tenant, admin, userData } = await getViewer();
     if (!customer && !tenant && !admin) {
          redirect('/auth/login');
     }

     let locations: BuildingLocation[] = [];
     let occupiedLocations: BuildingLocation[] = [];
     if (admin) {
          const { success, data } = await getAllLocations();
          locations = success && data ? data : [];
     } else if (customer) {
          const { data } = await getAllAddedLocationsByClientId(customer.id);
          locations = data ?? [];
          const { data: others } = await getAllOtherClientsLocations(customer.id);
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
                    customer: customer ?? null,
                    tenant: tenant ?? null,
                    admin: admin ?? null,
                    userData: userData ?? null
               }}
          />
     );
};

export default Page;
