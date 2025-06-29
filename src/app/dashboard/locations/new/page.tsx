'use server';

import { useAuth } from "src/hooks/use-auth";
import NewLocation from "./new-location";

const Page = async () => {

     const mapBoxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY!;
     const userSession = await useAuth();

     return (
          <NewLocation mapBoxAccessToken={mapBoxAccessToken} userSession={userSession} />
     );
};

export default Page;
