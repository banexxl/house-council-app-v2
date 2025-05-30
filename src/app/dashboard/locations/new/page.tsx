'use server';

import { getAllAddedLocations } from "src/app/actions/location-actions/location-services";
import NewLocation from "./new-location";

const Page = async () => {

     const mapBoxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
     const { data } = await getAllAddedLocations()

     return (
          <NewLocation mapBoxAccessToken={mapBoxAccessToken} locationsData={data || []} />
     );
};

export default Page;
