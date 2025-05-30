'use server';

import NewLocation from "./new-location";

const Page = async () => {

     const mapBoxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY!;

     return (
          <NewLocation mapBoxAccessToken={mapBoxAccessToken} />
     );
};

export default Page;
