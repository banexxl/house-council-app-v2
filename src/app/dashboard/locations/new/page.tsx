'use server';

import { useAuth } from "src/hooks/use-auth";
import NewLocation from "./new-location";
import { unauthorized } from "next/navigation";

const Page = async () => {

     const mapBoxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY!;
     const userSession = await useAuth();

     if (!userSession.client || !userSession.session) {
          return unauthorized();
     }

     return (
          <NewLocation mapBoxAccessToken={mapBoxAccessToken} userSession={userSession} />
     );
};

export default Page;
